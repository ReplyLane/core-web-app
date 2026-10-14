import {constantEqual,db,handle,hmac,HttpError,json,razorpay,runtime} from "@/lib/server";
import {providerTimestamp,type BillingRecord} from "@/lib/billing";

const lifecycleEvents=new Set(["subscription.authenticated","subscription.cancelled","subscription.completed","subscription.halted","subscription.paused","subscription.pending","subscription.resumed","subscription.activated","subscription.updated"]);
const providerStatuses=new Set(["created","authenticated","active","pending","halted","paused","cancelled","completed","expired"]);

export function POST(request:Request){return handle(async()=>{
 const secret=runtime().RAZORPAY_WEBHOOK_SECRET;if(!secret)throw new HttpError(503,"Payment webhook is not configured.");
 const raw=await request.text();if(raw.length>100000)throw new HttpError(413,"Payload too large.");
 const digest=await hmac(secret,raw);if(!constantEqual(digest,request.headers.get("x-razorpay-signature")||""))throw new HttpError(401,"Invalid signature.");
 let event;try{event=JSON.parse(raw);}catch{throw new HttpError(400,"Invalid webhook JSON.");}
 if(!event||typeof event.event!=="string"||!providerTimestamp(event.created_at))throw new HttpError(400,"Invalid webhook event.");
 const store=db(),receiptId="razorpay:"+digest;
 if(await store.prepare("SELECT id FROM webhook_receipts WHERE id=?").bind(receiptId).first())return json({ok:true});
 const subscription=event.payload?.subscription?.entity,payment=event.payload?.payment?.entity,createdAt=event.created_at*1000;
 const receipt=()=>store.prepare("INSERT INTO webhook_receipts(id,created_at) VALUES(?,?) ON CONFLICT(id) DO NOTHING").bind(receiptId,Date.now());
 if(event.event==="payment.refunded"&&payment?.id){
  const refunded=Number(payment.amount_refunded),amount=Number(payment.amount);
  if(Number.isFinite(refunded)&&Number.isFinite(amount)&&refunded>0&&amount>0){
   const full=refunded>=amount;
   await store.batch([store.prepare(full
    ?"UPDATE subscriptions SET status='refunded',payment_status='refunded',current_end=0,event_at=MAX(event_at,?),updated_at=? WHERE payment_id=?"
    :"UPDATE subscriptions SET payment_status='partially_refunded',event_at=MAX(event_at,?),updated_at=? WHERE payment_id=? AND status<>'refunded'")
    .bind(createdAt,Date.now(),payment.id),receipt()]);
  }else await receipt().run();
  return json({ok:true});
 }
 if(!subscription?.id||!/^sub_[A-Za-z0-9]+$/.test(subscription.id)||!(event.event==="subscription.charged"||lifecycleEvents.has(event.event))){await receipt().run();return json({ok:true});}
 const local=await store.prepare("SELECT * FROM subscriptions WHERE subscription_id=?").bind(subscription.id).first<BillingRecord>();
 if(!local){await receipt().run();return json({ok:true});}
 // Charge events have their own watermark: a later activation event must not discard an earlier captured invoice.
 // Legacy paid records predate payment_event_at. Their prior event watermark protects the existing payment reference.
 const chargeWatermark=local.payment_event_at||(local.payment_id&&!local.payment_status&&local.status!=="refunded"?local.event_at:0);
 if(createdAt<(event.event==="subscription.charged"?chargeWatermark:local.event_at)){await receipt().run();return json({ok:true});}
 const current=await razorpay("/subscriptions/"+subscription.id);
 const expectedPlan=local.interval==="monthly"?runtime().RAZORPAY_MONTHLY_PLAN_ID:runtime().RAZORPAY_YEARLY_PLAN_ID;
 if(current.plan_id!==expectedPlan||!providerStatuses.has(current.status))throw new HttpError(400,"Unexpected payment plan or subscription state.");
 const nextCharge=providerTimestamp(current.charge_at),cancelled=["cancelled","completed"].includes(current.status)?1:local.cancel_at_end;
 if(event.event==="subscription.charged"){
  const amount=local.interval==="monthly"?299:2499;
  if(typeof payment?.id!=="string"||!/^pay_[A-Za-z0-9]+$/.test(payment.id)||payment.status!=="captured"||payment.currency!=="USD"||payment.amount!==amount)throw new HttpError(400,"A captured payment matching the plan amount and currency is required.");
  // The current API cycle may be newer than this delayed invoice. Only its signed charge period was paid.
  const currentEnd=providerTimestamp(subscription.current_end),currentStart=providerTimestamp(subscription.current_start);
  if(subscription.plan_id!==expectedPlan||!currentEnd||currentStart>=currentEnd)throw new HttpError(400,"Unexpected payment plan or billing period.");
  if(local.status==="refunded"&&local.payment_id===payment.id){await receipt().run();return json({ok:true});}
  // A refund may arrive before this charge event. Read the payment's current state before granting access.
  const verified=await razorpay("/payments/"+payment.id),refunded=Number(verified.amount_refunded??0);
  if(verified.id!==payment.id||!["captured","refunded"].includes(verified.status)||verified.currency!=="USD"||verified.amount!==amount||!Number.isSafeInteger(refunded)||refunded<0)throw new HttpError(400,"The payment provider could not confirm this plan payment.");
  const fullyRefunded=refunded>=amount||verified.status==="refunded",paymentStatus=fullyRefunded?"refunded":refunded>0?"partially_refunded":"captured";
  await store.batch([store.prepare("UPDATE subscriptions SET status=?,current_start=?,current_end=CASE WHEN ?=1 THEN 0 ELSE MAX(current_end,?) END,next_charge_at=?,cancel_at_end=?,payment_id=?,payment_status=?,payment_event_at=?,event_at=MAX(event_at,?),updated_at=? WHERE subscription_id=? AND payment_event_at<=? AND NOT(status='refunded' AND payment_id=?)")
   .bind(fullyRefunded?"refunded":current.status,currentEnd>=local.current_end?currentStart:local.current_start,fullyRefunded?1:0,currentEnd,nextCharge,cancelled,payment.id,paymentStatus,createdAt,createdAt,Date.now(),subscription.id,createdAt,payment.id),receipt()]);
 }else{
  // Show the real provider state, but only a captured plan charge can extend the paid period.
  await store.batch([store.prepare("UPDATE subscriptions SET status=?,next_charge_at=?,cancel_at_end=?,event_at=?,updated_at=? WHERE subscription_id=? AND event_at<=? AND status<>'refunded'")
   .bind(current.status,nextCharge,cancelled,createdAt,Date.now(),subscription.id,createdAt),receipt()]);
 }
 return json({ok:true});
});}
