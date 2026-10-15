import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, campaign, comment } from './helpers/runtime.mjs';

async function create(f, value=campaign, user='alice') {
  return (await (await f.request('/api/campaigns',{method:'POST',data:value,user})).json()).id;
}

test('activity paginates all history with scoped totals and stable ordering',async t=>{
  const f=fixture();t.after(f.close);const id=await create(f);
  for(let i=0;i<133;i++)f.run("INSERT INTO activities(id,user_id,campaign_id,campaign_name,text,status,created_at,trigger) VALUES(?,?,?,?,?,'sent',?,'comment')",'event_'+i,'alice',id,'Guide','LINK',1000+i);
  f.run("INSERT INTO activities(id,user_id,campaign_name,text,status,created_at) VALUES('private','bob','Private','SECRET','sent',9999)");
  const first=await (await f.request('/api/activity')).json();
  assert.equal(first.summary.total,133);assert.equal(first.summary.accepted,133);assert.equal(first.pages,6);assert.equal(first.items.length,25);
  assert.equal(first.items[0].id,'event_132');assert.ok(first.items.every(r=>r.campaignName==='Guide'));
  const last=await (await f.request('/api/activity?page=999')).json();assert.equal(last.page,6);assert.equal(last.items.length,8);assert.equal(last.items.at(-1).id,'event_0');
  assert.equal(first.automations.length,1);assert.equal(first.automations[0].id,id);
  assert.equal((await f.request('/api/activity',{user:null})).status,401);
});

test('activity combines automation, source, trigger, status, search and date filters',async t=>{
  const f=fixture();t.after(f.close);const a=await create(f),b=await create(f,{...campaign,name:'Hours',trigger:'message'});
  const insert=(id,campaignId,trigger,status,time,test=0,text='LINK')=>f.run('INSERT INTO activities(id,user_id,campaign_id,campaign_name,text,status,created_at,trigger,test,sender_username) VALUES(?,?,?,?,?,?,?,?,?,?)',id,'alice',campaignId,campaignId===a?'Guide':'Hours',text,status,time,trigger,test,'test_creator');
  insert('accepted',a,'comment','sent',1000);insert('queued',a,'comment','queued',1500);insert('failed',b,'message','failed',1800);insert('tested',a,'comment','test_matched',1900,1);insert('outside',a,'comment','sent',2000);insert('literal',b,'message','skipped',1700,0,'100%_done');
  const q=new URLSearchParams({automation:a,source:'live',trigger:'comment',from:'1000',until:'2000',q:'Guide'});
  const result=await (await f.request('/api/activity?'+q)).json();assert.equal(result.summary.total,2);assert.equal(result.summary.accepted,1);assert.equal(result.summary.pending,1);assert.equal(result.summary.tests,0);
  assert.equal((await (await f.request('/api/activity?status=attention')).json()).items[0].id,'failed');
  assert.equal((await (await f.request('/api/activity?source=test')).json()).items[0].id,'tested');
  assert.equal((await (await f.request('/api/activity?q='+encodeURIComponent('%_'))).json()).items[0].id,'literal');
  assert.equal((await (await f.request('/api/activity?q='+encodeURIComponent("' OR 1=1 --"))).json()).summary.total,0);
  for(const query of ['page=0','from=bad','trigger=other','status=other','from=20&until=10','automation=not-a-uuid'])assert.equal((await f.request('/api/activity?'+query)).status,400);
});

test('real delivery keeps event and reply snapshots, receipt and acceptance time after rule edits/deletion',async t=>{
  const f=fixture();t.after(f.close);const id=await create(f);await f.account();f.paid();
  await f.request('/api/campaigns',{method:'PATCH',data:{id,enabled:true}});
  const payload=comment();payload.entry[0].changes[0].value.from.username='test_commenter';
  await f.request('/api/webhooks/instagram',{method:'POST',user:null,...f.sign(payload)});
  let event=(await (await f.request('/api/activity')).json()).items[0];
  assert.equal(event.status,'sent');assert.equal(event.trigger,'comment');assert.equal(event.senderUsername,'test_commenter');assert.equal(event.mediaId,'90001');assert.equal(event.matchedKeyword,'LINK');assert.equal(event.replyText,'Here is your guide\n\nhttps://creator.example/guide');assert.ok(event.acceptedAt>=event.attemptAt&&event.attemptAt>=event.createdAt);assert.ok(event.instagramMessageId.startsWith('mid_'));
  await f.request('/api/campaigns',{method:'PATCH',data:{...campaign,id,name:'Changed',message:'A different reply',trigger:'message'}});
  await f.request('/api/campaigns',{method:'DELETE',data:{id}});
  const history=await (await f.request('/api/activity?automation='+id+'&trigger=comment')).json();event=history.items[0];
  assert.equal(history.summary.total,1);assert.equal(event.campaignName,'Send guide');assert.equal(event.replyText,'Here is your guide\n\nhttps://creator.example/guide');assert.equal(history.automations[0].id,id);
});

test('simulations record their own trigger and preview without an API acceptance receipt',async t=>{
  const f=fixture();t.after(f.close);const id=await create(f,{...campaign,trigger:'message'});
  await f.request('/api/test',{method:'POST',data:{campaignId:id,text:'LINK please'}});
  const event=(await (await f.request('/api/activity?source=test&trigger=message')).json()).items[0];
  assert.equal(event.test,1);assert.equal(event.matchedKeyword,'LINK');assert.ok(event.replyText.includes('Here is your guide'));assert.equal(event.acceptedAt,0);assert.equal(event.instagramMessageId,'');assert.equal(f.calls.length,0);
});

test('older activity leaves missing historical details empty and other workspaces cannot select it',async t=>{
  const f=fixture();t.after(f.close);const id=await create(f);
  f.run("INSERT INTO activities(id,user_id,campaign_id,campaign_name,text,status,created_at,test) VALUES('old','alice',?,'Guide','LINK','test_matched',1,1)",id);
  const old=(await (await f.request('/api/activity')).json()).items[0];assert.equal(old.trigger,'');assert.equal(old.replyText,'');assert.equal(old.acceptedAt,0);
  const other=await (await f.request('/api/activity?automation='+id,{user:'bob'})).json();assert.equal(other.summary.total,0);assert.equal(other.automations.length,0);
});
