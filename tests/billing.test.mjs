import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/runtime.mjs';

const now=()=>Math.floor(Date.now()/1000);
async function checkout(f,interval='monthly'){
 const response=await f.request('/api/billing/checkout',{method:'POST',data:{interval}});
 assert.equal(response.status,200);
 const body=await response.json(),subscription=f.subscriptions.get(body.subscriptionId);
 return {body,subscription};
}
async function webhook(f,event,subscription,payment,createdAt=now()){
 return f.request('/api/webhooks/razorpay',{method:'POST',user:null,...f.sign({event,created_at:createdAt,payload:{subscription:{entity:subscription},...(payment?{payment:{entity:payment}}:{})}},'razorpay')});
}
function captured(f,subscription,id='pay_confirmed',amount=299){
 const payment={id,status:'captured',amount,currency:'USD',amount_refunded:0};
 f.payments.set(id,payment);
 Object.assign(subscription,{status:'active',current_start:now()-60,current_end:now()+2592000,charge_at:now()+2592000});
 return payment;
}

test('workspace exposes isolated server billing dates, references, access and payment state',async t=>{
 const f=fixture();t.after(f.close);
 const {subscription}=await checkout(f),payment=captured(f,subscription);
 assert.equal((await webhook(f,'subscription.charged',subscription,payment)).status,200);
 const response=await f.request('/api/workspace'),{billing}=await response.json();
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(billing.subscriptionId,subscription.id);
 assert.equal(billing.paymentId,payment.id);
 assert.equal(billing.paymentStatus,'captured');
 assert.equal(billing.currentStart,subscription.current_start);
 assert.equal(billing.currentEnd,subscription.current_end);
 assert.equal(billing.nextChargeAt,subscription.charge_at);
 assert.equal(billing.cancelAtEnd,false);
 assert.equal(billing.hasPaidAccess,true);
 assert.equal(billing.canResumeCheckout,false);
 assert.ok(billing.updatedAt>0);
 assert.equal((await(await f.request('/api/workspace',{user:'bob'})).json()).billing,null);
});

test('unconfirmed checkout locks are not exposed as Razorpay subscription references',async t=>{
 const f=fixture();t.after(f.close);
 f.run("INSERT INTO subscriptions(user_id,subscription_id,interval,status) VALUES('alice','local-lock-id','monthly','checkout_uncertain')");
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.subscriptionId,null);
 assert.equal(billing.paymentId,null);
 assert.equal(billing.paymentStatus,'awaiting_payment');
 assert.equal(billing.hasPaidAccess,false);
 assert.equal(billing.canResumeCheckout,false);
});

test('checkout resumes its existing hosted link and replaces an expired unpaid link',async t=>{
 const f=fixture();t.after(f.close);
 const first=await checkout(f),second=await checkout(f);
 assert.deepEqual(first.body,second.body);
 assert.equal((await(await f.request('/api/workspace')).json()).billing.canResumeCheckout,true);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/subscriptions')&&c.method==='POST').length,1);
 first.subscription.expire_by=now()-1;
 const renewed=await checkout(f);
 assert.notEqual(renewed.body.subscriptionId,first.body.subscriptionId);
 assert.equal(first.subscription.status,'cancelled');
});

test('ambiguous provider failures hold checkout while an explicit rejection allows a corrected retry',async t=>{
 for(const providerStatus of [500,400]){
  const f=fixture();t.after(f.close);
  f.overrides.create=()=>Response.json({error:'provider failure'},{status:providerStatus});
  assert.equal((await f.request('/api/billing/checkout',{method:'POST',data:{interval:'monthly'}})).status,502);
  assert.equal(f.rows('SELECT status FROM subscriptions')[0].status,providerStatus===500?'checkout_uncertain':'checkout_error');
  delete f.overrides.create;
  assert.equal((await f.request('/api/billing/checkout',{method:'POST',data:{interval:'monthly'}})).status,providerStatus===500?409:200);
 }
});

test('monthly and annual subscription counts preserve the supported duration and reject INR price substitutions',async t=>{
 for(const [interval,count]of [['monthly',1200],['yearly',100]]){
  const f=fixture();t.after(f.close);await checkout(f,interval);
  const call=f.calls.find(c=>c.url.endsWith('/subscriptions')&&c.method==='POST');
  assert.equal(JSON.parse(call.body).total_count,count);
 }
 const f=fixture();t.after(f.close);
 f.overrides.plan={item:{amount:299,currency:'INR'},period:'monthly',interval:1};
 assert.equal((await f.request('/api/billing/checkout',{method:'POST',data:{interval:'monthly'}})).status,503);
 assert.equal(f.calls.some(c=>c.url.endsWith('/subscriptions')),false);
});

test('authorisation and activation show provider status without granting an unpaid billing period',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f);
 Object.assign(subscription,{status:'authenticated',charge_at:now()+3600});
 assert.equal((await webhook(f,'subscription.authenticated',subscription)).status,200);
 let {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.status,'authenticated');assert.equal(billing.nextChargeAt,subscription.charge_at);
 assert.equal(billing.currentEnd,0);assert.equal(billing.hasPaidAccess,false);assert.equal(billing.canResumeCheckout,false);
 Object.assign(subscription,{status:'active',current_end:now()+2592000});
 assert.equal((await webhook(f,'subscription.activated',subscription,undefined,now()+1)).status,200);
 billing=(await(await f.request('/api/workspace')).json()).billing;
 assert.equal(billing.status,'active');assert.equal(billing.currentEnd,0);assert.equal(billing.hasPaidAccess,false);
});

test('a later lifecycle event does not discard an earlier captured payment',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f),payment=captured(f,subscription),time=now();
 assert.equal((await webhook(f,'subscription.activated',subscription,undefined,time+2)).status,200);
 assert.equal((await webhook(f,'subscription.charged',subscription,payment,time)).status,200);
 assert.equal(await f.load('lib/server.ts').paid('alice'),true);
 assert.equal(f.rows('SELECT event_at FROM subscriptions')[0].event_at,(time+2)*1000);
 const updated=f.rows('SELECT updated_at FROM subscriptions')[0].updated_at;
 assert.equal((await webhook(f,'subscription.charged',subscription,payment,time)).status,200);
 assert.equal(f.rows('SELECT updated_at FROM subscriptions')[0].updated_at,updated);
});

test('a stale charge cannot replace the latest payment reference or remove its refund state',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f),old=captured(f,subscription,'pay_old'),time=now();
 assert.equal((await webhook(f,'subscription.charged',subscription,old,time)).status,200);
 const latest=captured(f,subscription,'pay_latest');
 assert.equal((await webhook(f,'subscription.charged',subscription,latest,time+10)).status,200);
 assert.equal((await webhook(f,'subscription.charged',subscription,old,time+1)).status,200);
 const refund={...latest,amount_refunded:50};
 assert.equal((await webhook(f,'payment.refunded',subscription,refund,time+11)).status,200);
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.paymentId,'pay_latest');assert.equal(billing.paymentStatus,'partially_refunded');
 assert.equal(billing.hasPaidAccess,true);
});

test('a refund delivered before its charge cannot grant refunded access',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f),payment=captured(f,subscription),time=now();
 const refund={...payment,status:'refunded',amount_refunded:299};f.payments.set(payment.id,refund);
 assert.equal((await webhook(f,'payment.refunded',subscription,refund,time+1)).status,200);
 assert.equal((await webhook(f,'subscription.charged',subscription,payment,time)).status,200);
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.status,'refunded');assert.equal(billing.paymentStatus,'refunded');
 assert.equal(billing.currentEnd,0);assert.equal(billing.hasPaidAccess,false);
 assert.equal(billing.nextChargeAt,subscription.charge_at);assert.equal(billing.canCancel,true);
});

test('annual captured payments are verified and renewal cancellation is idempotent and isolated',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f,'yearly'),payment=captured(f,subscription,'pay_yearly',2499);
 assert.equal((await webhook(f,'subscription.charged',subscription,payment)).status,200);
 assert.equal((await f.request('/api/billing/cancel',{method:'POST',data:{},user:'bob'})).status,409);
 assert.equal((await f.request('/api/billing/cancel',{method:'POST',data:{},origin:'https://other.test'})).status,403);
 for(let i=0;i<2;i++)assert.equal((await f.request('/api/billing/cancel',{method:'POST',data:{}})).status,200);
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.cancelAtEnd,true);assert.equal(billing.nextChargeAt,0);assert.equal(billing.hasPaidAccess,true);
 assert.equal(f.calls.filter(c=>c.url.endsWith('/cancel')).length,1);
});

test('a signed charge still requires current provider confirmation of the payment amount',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f),payment=captured(f,subscription);
 f.payments.set(payment.id,{...payment,amount:1});
 assert.equal((await webhook(f,'subscription.charged',subscription,payment)).status,400);
 assert.equal(await f.load('lib/server.ts').paid('alice'),false);
});

test('a delayed paid invoice cannot grant a newer provider billing period',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f),payment=captured(f,subscription),time=now();
 const chargedSnapshot={...subscription,current_start:time-2592000,current_end:time-1};
 Object.assign(subscription,{current_start:time,current_end:time+2592000});
 assert.equal((await webhook(f,'subscription.charged',chargedSnapshot,payment)).status,200);
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.currentEnd,time-1);assert.equal(billing.hasPaidAccess,false);
});

test('authorised, failed, paused and refunded mandates offer immediate cancellation',async t=>{
 for(const status of ['created','authenticated','pending','halted','paused','refunded']){
  const f=fixture();t.after(f.close);const {subscription}=await checkout(f);
  subscription.status=status==='refunded'?'active':status;
  f.run('UPDATE subscriptions SET status=?',status);
  assert.equal((await(await f.request('/api/workspace')).json()).billing.canCancel,true);
  assert.equal((await f.request('/api/billing/cancel',{method:'POST',data:{}})).status,200);
  const call=f.calls.find(c=>c.url.endsWith('/cancel'));
  assert.equal(JSON.parse(call.body).cancel_at_cycle_end,0);
  const {billing}=await(await f.request('/api/workspace')).json();
  assert.equal(billing.cancelAtEnd,true);assert.equal(billing.canCancel,false);assert.equal(billing.hasPaidAccess,false);
 }
});

test('refund of an earlier payment cannot discard a delayed successful renewal',async t=>{
 const f=fixture();t.after(f.close);const {subscription}=await checkout(f),first=captured(f,subscription,'pay_first'),time=now();
 assert.equal((await webhook(f,'subscription.charged',subscription,first,time)).status,200);
 const renewal=captured(f,subscription,'pay_renewal');
 assert.equal((await webhook(f,'payment.refunded',subscription,{...first,amount_refunded:299},time+11)).status,200);
 assert.equal((await webhook(f,'subscription.charged',subscription,renewal,time+10)).status,200);
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.paymentId,'pay_renewal');assert.equal(billing.paymentStatus,'captured');assert.equal(billing.hasPaidAccess,true);
});

test('legacy refunded subscription rows never report a captured payment',async t=>{
 const f=fixture();t.after(f.close);f.paid();
 f.run("UPDATE subscriptions SET status='refunded',payment_id='pay_legacy',current_end=0");
 const {billing}=await(await f.request('/api/workspace')).json();
 assert.equal(billing.paymentStatus,'refunded');assert.equal(billing.hasPaidAccess,false);
});
