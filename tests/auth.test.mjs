import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, campaign, comment } from './helpers/runtime.mjs';

const cookies = response => response.headers.getSetCookie().filter(c => !c.includes('Max-Age=0')).map(c => c.split(';')[0]).join('; ');
function socialFixture(t) { const f = fixture(); t.after(f.close); f.env.AUTH_MODE='meta'; f.env.FACEBOOK_APP_ID='facebook-app'; f.env.FACEBOOK_APP_SECRET='facebook-secret'; f.env.FACEBOOK_LOGIN_CONFIG_ID='facebook-config'; return f; }
async function start(f, provider='instagram') {
  const response=await f.request(`/api/${provider}/connect?intent=login`,{user:null});
  assert.equal(response.status,302);
  return {state:new URL(response.headers.get('location')).searchParams.get('state'),cookie:cookies(response),response};
}
async function login(f) {
  const flow=await start(f);
  const response=await f.request('/api/instagram/callback?code=code&state='+flow.state,{user:null,headers:{cookie:flow.cookie}});
  assert.ok(response.headers.get('location').includes('connected=1'));
  return {response,cookie:cookies(response)};
}
async function facebook(f) {
  const flow=await start(f,'facebook');
  const response=await f.request('/api/facebook/callback?code=code&state='+flow.state,{user:null,headers:{cookie:flow.cookie}});
  return {response,cookie:[flow.cookie,cookies(response)].join('; ')};
}

test('social auth rejects forged hosting identity and malformed sessions',async t=>{
  const f=socialFixture(t);
  assert.equal((await f.request('/api/workspace')).status,401);
  assert.equal((await f.request('/api/workspace',{headers:{cookie:'replylane_session=invalid'}})).status,401);
  assert.equal(f.calls.length,0);
});
test('Instagram login imports a profile, hashes the session, and allows isolated automation setup',async t=>{
  const f=socialFixture(t),signed=await login(f);
  const stored=f.rows('SELECT * FROM auth_sessions')[0];
  assert.ok(!signed.cookie.includes(stored.id));
  assert.ok(signed.response.headers.getSetCookie().some(c=>c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Lax')));
  const request={user:null,headers:{cookie:signed.cookie}};
  const workspace=await(await f.request('/api/workspace',request)).json();
  assert.equal(workspace.account.username,'test_creator'); assert.equal(workspace.account.followers,123); assert.equal(workspace.user.name,'Test Creator');
  assert.ok(!JSON.stringify(workspace).includes('long-token'));
  assert.equal((await f.request('/api/campaigns',{...request,method:'POST',data:campaign})).status,201);
  assert.equal((await f.request('/api/workspace',{user:null})).status,401);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/messages')).length,0);
});
test('OAuth requires the starting browser, rejects provider substitution, and cannot be replayed',async t=>{
  const f=socialFixture(t),flow=await start(f);
  await f.request('/api/instagram/callback?code=code&state='+flow.state,{user:null});
  await f.request('/api/facebook/callback?code=code&state='+flow.state,{user:null,headers:{cookie:flow.cookie}});
  assert.equal(f.calls.length,0);
  const path='/api/instagram/callback?code=code&state='+flow.state;
  const good=await f.request(path,{user:null,headers:{cookie:flow.cookie}});assert.ok(good.headers.get('location').includes('connected=1'));
  const count=f.calls.length;await f.request(path,{user:null,headers:{cookie:flow.cookie}});assert.equal(f.calls.length,count);
});
test('cancelled login consumes state without creating accounts or calling Meta',async t=>{
  const f=socialFixture(t),flow=await start(f);
  await f.request('/api/instagram/callback?error=access_denied&state='+flow.state,{user:null,headers:{cookie:flow.cookie}});
  assert.equal(f.rows('SELECT * FROM oauth_states').length,0);assert.equal(f.rows('SELECT * FROM auth_users').length,0);assert.equal(f.calls.length,0);
});
test('returning sign-in preserves drafts and rotates the current browser session',async t=>{
  const f=socialFixture(t),first=await login(f);
  await f.request('/api/campaigns',{method:'POST',data:campaign,user:null,headers:{cookie:first.cookie}});
  const flow=await start(f),response=await f.request('/api/instagram/callback?code=again&state='+flow.state,{user:null,headers:{cookie:flow.cookie+'; '+first.cookie}});
  assert.equal(f.rows('SELECT * FROM auth_users').length,1);assert.equal(f.rows('SELECT * FROM auth_sessions').length,1);
  assert.equal((await f.request('/api/workspace',{user:null,headers:{cookie:first.cookie}})).status,401);
  const workspace=await(await f.request('/api/workspace',{user:null,headers:{cookie:cookies(response)}})).json();assert.equal(workspace.campaigns.length,1);
});
test('expiry, logout, and same-origin validation protect sessions',async t=>{
  const f=socialFixture(t),signed=await login(f),headers={cookie:signed.cookie};
  assert.equal((await f.request('/api/auth/logout',{method:'POST',user:null,headers,origin:'https://evil.test'})).status,403);
  assert.equal((await f.request('/api/auth/logout',{method:'POST',user:null,headers,origin:null})).status,403);
  assert.equal((await f.request('/api/workspace',{user:null,headers})).status,200);
  assert.equal((await f.request('/api/auth/logout',{method:'POST',user:null,headers})).status,200);
  assert.equal((await f.request('/api/workspace',{user:null,headers})).status,401);
  const again=await login(f);f.run('UPDATE auth_sessions SET expires_at=?',Date.now()-1);
  assert.equal((await f.request('/api/workspace',{user:null,headers:{cookie:again.cookie}})).status,401);
});
test('Facebook account choices contain no tokens and selection is browser-bound, same-origin, and single-use',async t=>{
  const f=socialFixture(t),flow=await facebook(f);assert.ok(flow.response.headers.get('location').endsWith('/connect/facebook'));
  assert.equal(f.rows('SELECT * FROM auth_sessions').length,0);
  const pending=f.rows('SELECT * FROM oauth_pending')[0];assert.ok(!pending.encrypted_data.includes('facebook-page-token'));
  const headers={cookie:flow.cookie};
  const choices=await(await f.request('/api/facebook/accounts',{user:null,headers})).json();assert.equal(choices.accounts[0].username,'test_creator');assert.ok(!JSON.stringify(choices).includes('token'));
  assert.equal((await f.request('/api/facebook/accounts',{user:null})).status,401);
  assert.equal((await f.request('/api/facebook/accounts',{user:null,headers,method:'POST',data:{accountId:'10001'},origin:'https://evil.test'})).status,403);
  assert.equal((await f.request('/api/facebook/accounts',{user:null,headers,method:'POST',data:{accountId:'arbitrary'}})).status,400);
  const selected=await f.request('/api/facebook/accounts',{user:null,headers,method:'POST',data:{accountId:'10001'}});assert.equal(selected.status,200);
  assert.equal((await selected.json()).url,'https://app.test/?connected=1&setup=1');assert.ok(cookies(selected).includes('replylane_session='));
  assert.equal((await f.request('/api/facebook/accounts',{user:null,headers,method:'POST',data:{accountId:'10001'}})).status,401);
  const account=f.rows('SELECT * FROM accounts')[0];assert.equal(account.provider,'facebook');assert.equal(account.page_id,'30001');
});
test('Facebook requires a linked professional account and expired selections cannot connect',async t=>{
  const f=socialFixture(t);f.overrides.facebookPages={data:[{id:'30001',name:'Page without Instagram',access_token:'page-token'}]};
  const empty=await facebook(f);assert.ok(empty.response.headers.get('location').includes('no_accounts'));assert.equal(f.rows('SELECT * FROM accounts').length,0);
  delete f.overrides.facebookPages;const flow=await facebook(f);f.run('UPDATE oauth_pending SET expires_at=?',Date.now()-1);
  assert.equal((await f.request('/api/facebook/accounts',{user:null,headers:{cookie:flow.cookie}})).status,401);
});
test('accounts and login identities cannot be silently moved between workspaces',async t=>{
  const f=socialFixture(t);await f.account('existing-owner');
  const flow=await start(f),response=await f.request('/api/instagram/callback?code=code&state='+flow.state,{user:null,headers:{cookie:flow.cookie}});
  assert.ok(response.headers.get('location').includes('account_conflict'));assert.equal(f.rows('SELECT * FROM auth_sessions').length,0);assert.equal(f.rows('SELECT user_id FROM accounts')[0].user_id,'existing-owner');
});
test('a simultaneous first login cannot claim an account or identity after another login wins',async t=>{
  const f=socialFixture(t),first=await start(f),second=await start(f);
  let release,entered;const barrier=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>entered=resolve);let subscriptions=0;
  f.overrides.subscribe=async()=>{if(++subscriptions===1){entered();await barrier;}return Response.json({success:true});};
  const delayed=f.request('/api/instagram/callback?code=first&state='+first.state,{user:null,headers:{cookie:first.cookie}});
  await waiting;
  const winner=await f.request('/api/instagram/callback?code=second&state='+second.state,{user:null,headers:{cookie:second.cookie}});assert.ok(winner.headers.get('location').includes('connected=1'));
  release();const loser=await delayed;assert.ok(loser.headers.get('location').includes('connect_error'));
  assert.equal(f.rows('SELECT * FROM auth_users').length,1);assert.equal(f.rows('SELECT * FROM auth_identities').length,1);assert.equal(f.rows('SELECT * FROM auth_sessions').length,1);assert.equal(f.rows('SELECT * FROM accounts').length,1);
});
test('media loading uses the connected account and never exposes access tokens',async t=>{
  const f=socialFixture(t),signed=await login(f),headers={cookie:signed.cookie};
  assert.equal((await f.request('/api/instagram/media',{user:null})).status,401);
  const r=await f.request('/api/instagram/media',{user:null,headers});assert.equal(r.status,200);const data=await r.json();assert.equal(data.media[0].id,'90001');assert.ok(!JSON.stringify(data).includes('long-token'));
  const call=f.calls.find(c=>c.url.includes('/10001/media'));assert.ok(call.url.startsWith('https://graph.instagram.com/'));assert.equal(call.headers.get('authorization'),'Bearer long-token');
  f.run('UPDATE accounts SET expires_at=?',Date.now()-1);assert.equal((await f.request('/api/instagram/media',{user:null,headers})).status,409);
});
test('Facebook deliveries use the Facebook host and only accept the matching app signature',async t=>{
  const f=socialFixture(t),flow=await facebook(f),selected=await f.request('/api/facebook/accounts',{user:null,headers:{cookie:flow.cookie},method:'POST',data:{accountId:'10001'}});
  const headers={cookie:cookies(selected)},userId=f.rows('SELECT id FROM auth_users')[0].id;f.paid(userId);
  const created=await f.request('/api/campaigns',{method:'POST',user:null,headers,data:campaign});const id=(await created.json()).id;
  assert.equal((await f.request('/api/campaigns',{method:'PATCH',user:null,headers,data:{id,enabled:true}})).status,200);
  const payload=comment();await f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(payload)});assert.equal(f.calls.filter(c=>c.url.endsWith('/messages')).length,0);
  const raw=JSON.stringify(payload),signature=await f.load('lib/server.ts').hmac(f.env.FACEBOOK_APP_SECRET,raw);
  assert.equal((await f.request('/api/webhooks/instagram',{method:'POST',user:null,raw,headers:{'x-hub-signature-256':'sha256='+signature}})).status,200);
  assert.ok(f.calls.find(c=>c.url.endsWith('/messages')).url.startsWith('https://graph.facebook.com/'));
});
