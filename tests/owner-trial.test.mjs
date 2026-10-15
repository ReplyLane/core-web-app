import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,campaign,message} from './helpers/runtime.mjs';

async function owner(f,{used=0,expires=Date.now()+86400000}={}) {
 await f.account();
 f.run('INSERT INTO owner_trials(user_id,instagram_id,starts_at,expires_at,dm_limit,used) VALUES(?,?,?,?,25,?)','alice','10001',Date.now()-1000,expires,used);
 const created=await f.request('/api/campaigns',{method:'POST',data:{...campaign,trigger:'message'}});
 return (await created.json()).id;
}
const enable=(f,id)=>f.request('/api/campaigns',{method:'PATCH',data:{id,enabled:true}});
const incoming=(f,id)=>f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(message(id))});

test('owner trial enables the verified account without inventing a paid subscription',async t=>{
 const f=fixture();t.after(f.close);const id=await owner(f);
 assert.equal((await enable(f,id)).status,200);
 const snapshot=await(await f.request('/api/workspace')).json();
 assert.equal(snapshot.billing,null);assert.equal(snapshot.access.mode,'owner_trial');assert.equal(snapshot.access.trial.remaining,25);
 await incoming(f,'owner-first');
 assert.equal(f.rows('SELECT used FROM owner_trials')[0].used,1);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/messages')).length,1);
 await f.account('bob','10002');
 const created=await f.request('/api/campaigns',{method:'POST',user:'bob',data:campaign});
 assert.equal((await f.request('/api/campaigns',{method:'PATCH',user:'bob',data:{id:(await created.json()).id,enabled:true}})).status,402);
 assert.equal((await(await f.request('/api/workspace',{user:'bob'})).json()).access.trial,null);
});

test('trial expiry and changing the connected Instagram account revoke sending',async t=>{
 for(const change of [f=>f.run('UPDATE owner_trials SET expires_at=?',Date.now()-1),f=>f.run("UPDATE accounts SET instagram_id='10002'")]){
  const f=fixture();t.after(f.close);const id=await owner(f);await enable(f,id);change(f);
  assert.equal((await enable(f,id)).status,402);
  await incoming(f,'revoked');assert.equal(f.calls.length,0);
 }
});

test('the 25-DM lifetime cap survives monthly quota resets and holds ambiguous outcomes',async t=>{
 const f=fixture();t.after(f.close);const id=await owner(f,{used:24});await enable(f,id);
 f.overrides.send=()=>{throw new Error('unconfirmed send');};
 await incoming(f,'last');assert.equal(f.rows('SELECT used FROM owner_trials')[0].used,25);
 f.run('DELETE FROM usage');f.run('UPDATE accounts SET next_send_at=0');
 await incoming(f,'over-cap');
 assert.equal(f.calls.filter(c=>c.url.endsWith('/messages')).length,1);
 assert.equal((await enable(f,id)).status,402);
 assert.equal(f.rows('SELECT used FROM owner_trials')[0].used,25);
});

test('atomic trial reservations permit only the final available send',async t=>{
 const f=fixture();t.after(f.close);await owner(f,{used:24});
 const access=f.load('lib/access.ts');
 const results=await Promise.all(Array.from({length:8},()=>access.reserveTrial('alice','10001')));
 assert.equal(results.filter(Boolean).length,1);assert.equal(f.rows('SELECT used FROM owner_trials')[0].used,25);
});

test('definitive provider rejection releases trial quota, while simulations never reserve it',async t=>{
 const f=fixture();t.after(f.close);const id=await owner(f);await enable(f,id);
 await f.request('/api/test',{method:'POST',data:{campaignId:id,text:'LINK'}});
 assert.equal(f.rows('SELECT used FROM owner_trials')[0].used,0);
 f.overrides.send=()=>Response.json({error:'rejected'},{status:400});
 await incoming(f,'rejected');assert.equal(f.rows('SELECT used FROM owner_trials')[0].used,0);
 assert.equal(f.rows('SELECT sent FROM usage')[0].sent,0);
});

test('paced replies start a durable drain; a queue outage causes Meta to retry the saved event',async t=>{
 const f=fixture();t.after(f.close);const id=await owner(f);await enable(f,id);f.env.DELIVERY_WORKFLOW_ENABLED='true';
 f.run('UPDATE accounts SET next_send_at=?',Date.now()+60000);f.overrides.schedule=true;
 assert.equal((await incoming(f,'paced')).status,503);
 assert.equal(f.rows('SELECT status FROM activities')[0].status,'queued');
 f.overrides.schedule=false;assert.equal((await incoming(f,'paced')).status,200);
 assert.deepEqual(f.scheduled,['alice']);assert.equal(f.rows('SELECT * FROM activities').length,1);
 f.run('UPDATE accounts SET next_send_at=0');
 await f.load('lib/delivery.ts').deliverOne('alice');
 assert.equal(f.rows('SELECT status FROM activities')[0].status,'sent');
 assert.equal(f.calls.filter(c=>c.url.endsWith('/messages')).length,1);
});

test('delivery recovery rejects forged workers and scopes customer runs to their workspace',async t=>{
 const f=fixture();t.after(f.close);await owner(f);f.env.DELIVERY_WORKFLOW_ENABLED='true';
 assert.equal((await f.request('/api/deliveries',{method:'POST',user:null,headers:{authorization:'Bearer wrong'}})).status,401);
 assert.equal((await f.request('/api/deliveries',{method:'POST',user:null})).status,401);
 assert.equal(f.scheduled.length,0);
 assert.equal((await f.request('/api/deliveries',{method:'POST',user:'bob'})).status,200);
 assert.deepEqual(f.scheduled,['bob']);
 assert.equal((await f.request('/api/deliveries',{method:'POST',user:null,headers:{authorization:'Bearer test-worker-secret'}})).status,200);
 assert.equal(f.scheduled.at(-1),undefined);
});
