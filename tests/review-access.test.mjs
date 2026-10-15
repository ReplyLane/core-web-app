import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixture, campaign, message } from './helpers/runtime.mjs';

const code='R'.repeat(43), otherCode='S'.repeat(43);
const digest=value=>createHash('sha256').update(value).digest('hex');
function invite(f,{value=code,created=Date.now()-1000,expires=Date.now()+30*86400000}={}) {
 f.run('INSERT INTO review_invites(code_hash,created_at,expires_at,max_claims) VALUES(?,?,?,3)',digest(value),created,expires);
}
const claim=(f,user='alice',value=code,options={})=>f.request('/api/review-access',{method:'POST',user,data:{code:value},...options});

test('review invitations require authentication, the application origin and a connected account',async t=>{
 const f=fixture();t.after(f.close);invite(f);
 assert.equal((await claim(f,null)).status,401);
 assert.equal((await claim(f,'alice',code,{origin:'https://other.example'})).status,403);
 assert.equal((await claim(f,'alice','short')).status,400);
 assert.equal((await claim(f)).status,409);
 assert.equal(f.rows('SELECT * FROM review_trials').length,0);
});

test('only a valid private invitation grants account-bound review access without a subscription',async t=>{
 const f=fixture();t.after(f.close);await f.account();invite(f);
 assert.equal((await claim(f,'alice',otherCode)).status,409);
 const response=await claim(f);assert.equal(response.status,200);
 const {access}=await response.json();
 assert.equal(access.mode,'review_trial');assert.equal(access.trial.kind,'review');
 assert.equal(access.canSend,true);assert.equal(access.trial.remaining,25);
 assert.ok(access.trial.expiresAt<=Date.now()+7*86400000);
 assert.equal(f.rows('SELECT * FROM subscriptions').length,0);
 assert.equal(f.rows('SELECT code_hash FROM review_invites')[0].code_hash,digest(code));
 assert.equal(f.rows('SELECT * FROM campaigns').length,0);
 await f.account('bob','10002');
 const created=await f.request('/api/campaigns',{method:'POST',user:'bob',data:campaign});
 assert.equal((await f.request('/api/campaigns',{method:'PATCH',user:'bob',data:{id:(await created.json()).id,enabled:true}})).status,402);
});

test('review invitation claims are capped atomically at three accounts',async t=>{
 const f=fixture();t.after(f.close);invite(f);
 const users=Array.from({length:8},(_,i)=>'reviewer'+i);
 for(const [i,user] of users.entries())await f.account(user,String(10001+i));
 const responses=await Promise.all(users.map(user=>claim(f,user)));
 assert.equal(responses.filter(r=>r.status===200).length,3);
 assert.equal(f.rows('SELECT * FROM review_trials').length,3);
});

test('repeated claims, new codes and reconnects cannot reset or transfer test access',async t=>{
 const f=fixture();t.after(f.close);await f.account();invite(f);await claim(f);
 const original=f.rows('SELECT expires_at FROM review_trials')[0].expires_at;
 f.run('UPDATE review_trials SET used=12');
 assert.equal((await claim(f)).status,200);
 assert.equal(f.rows('SELECT used,expires_at FROM review_trials')[0].used,12);
 assert.equal(f.rows('SELECT expires_at FROM review_trials')[0].expires_at,original);
 invite(f,{value:otherCode});assert.equal((await claim(f,'alice',otherCode)).status,409);
 f.run("UPDATE accounts SET instagram_id='10002' WHERE user_id='alice'");
 assert.equal((await f.load('lib/access.ts').sendingAccess('alice')).canSend,false);
 assert.equal((await claim(f)).status,409);
 await f.account('bob','10001');assert.equal((await claim(f,'bob')).status,409);
});

test('expired/future invitations, expired accounts and existing owner trials cannot receive another grant',async t=>{
 for(const setup of [
  f=>invite(f,{expires:Date.now()-1}),
  f=>invite(f,{created:Date.now()+86400000}),
  f=>{invite(f);f.run('UPDATE accounts SET expires_at=?',Date.now()-1);},
  f=>{invite(f);f.run('INSERT INTO owner_trials VALUES(?,?,?,?,25,25)','alice','10001',Date.now()-86400000,Date.now()-1);},
 ]){
  const f=fixture();t.after(f.close);await f.account();setup(f);
  assert.equal((await claim(f)).status,409);assert.equal(f.rows('SELECT * FROM review_trials').length,0);
 }
 const f=fixture();t.after(f.close);await f.account();invite(f,{expires:Date.now()+86400000});
 await claim(f);const grant=f.rows('SELECT expires_at FROM review_trials')[0];
 assert.equal(grant.expires_at,f.rows('SELECT expires_at FROM review_invites')[0].expires_at);
 f.run('UPDATE review_trials SET expires_at=?',Date.now()-1);
 assert.equal((await f.load('lib/access.ts').sendingAccess('alice')).canSend,false);
});

test('real review sends enforce the lifetime cap and retain ambiguous reservations',async t=>{
 const f=fixture();t.after(f.close);await f.account();invite(f);await claim(f);
 const created=await f.request('/api/campaigns',{method:'POST',data:{...campaign,trigger:'message'}});
 const id=(await created.json()).id;
 assert.equal((await f.request('/api/campaigns',{method:'PATCH',data:{id,enabled:true}})).status,200);
 f.run('UPDATE review_trials SET used=24');
 f.overrides.send=()=>{throw new Error('unconfirmed');};
 await f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(message('review-last'))});
 assert.equal(f.rows('SELECT used FROM review_trials')[0].used,25);
 assert.equal(f.rows('SELECT status FROM activities')[0].status,'needs_review');
 f.run('DELETE FROM usage');f.run('UPDATE accounts SET next_send_at=0');
 await f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(message('over-cap'))});
 assert.equal(f.calls.filter(c=>c.url.endsWith('/messages')).length,1);
 assert.equal((await f.request('/api/campaigns',{method:'PATCH',data:{id,enabled:true}})).status,402);
});

test('review quota is released on definitive rejection and is unused by paid delivery',async t=>{
 const f=fixture();t.after(f.close);await f.account();invite(f);await claim(f);
 const created=await f.request('/api/campaigns',{method:'POST',data:{...campaign,trigger:'message'}}),id=(await created.json()).id;
 await f.request('/api/campaigns',{method:'PATCH',data:{id,enabled:true}});
 f.overrides.send=()=>Response.json({error:'denied'},{status:400});
 await f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(message('denied'))});
 assert.equal(f.rows('SELECT used FROM review_trials')[0].used,0);
 f.paid();f.run('UPDATE accounts SET next_send_at=0');f.overrides.send=undefined;
 await f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(message('paid'))});
 assert.equal(f.rows('SELECT used FROM review_trials')[0].used,0);
 assert.equal((await f.load('lib/access.ts').sendingAccess('alice')).mode,'paid');
});
