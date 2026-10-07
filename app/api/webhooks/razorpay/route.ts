import {constantEqual,db,handle,hmac,HttpError,json,razorpay,runtime} from "@/lib/server";
export function POST(request:Request){return handle(async()=>{
 const secret=runtime().RAZORPAY_WEBHOOK_SECRET;if(!secret)throw new HttpError(503,"Payment webhook is not configured.");
 const raw=await request.text();if(raw.length>100000)throw new HttpError(413,"Payload too large.");
 const digest=await hmac(secret,raw);if(!constantEqual(digest,request.headers.get("x-razorpay-signature")||""))throw new HttpError(401,"Invalid signature.");
 let event;try{event=JSON.parse(raw);}catch{throw new HttpError(400,"Invalid webhook JSON.");}
 if(!event||typeof event.event!=="string"||!Number.isFinite(event.created_at)||event.created_at<=0)throw new HttpError(400,"Invalid webhook event.");
 const store=db(),receiptId="razorpay:"+digest;
 if(await store.prepare("SELECT id FROM webhook_receipts WHERE id=?").bind(receiptId).first())return json({ok:true});
 const subscription=event.payload?.subscription?.entity,payment=event.payload?.payment?.entity,createdAt=event.created_at*1000;
 const receipt=()=>store.prepare("INSERT INTO webhook_receipts(id,created_at) VALUES(?,?) ON CONFLICT(id) DO NOTHING").bind(receiptId,Date.now());
 if(event.event==="payment.refunded"&&payment?.id){
  if(Number(payment.amount_refunded)>=Number(payment.amount)&&Number(payment.amount)>0)await store.batch([store.prepare("UPDATE subscriptions SET status='refunded',current_end=0,event_at=MAX(event_at,?) WHERE payment_id=?").bind(createdAt,payment.id),receipt()]);
  else await receipt().run();return json({ok:true});
 }
 if(!subscription?.id)return json({ok:true});
 const local=await store.prepare("SELECT * FROM subscriptions WHERE subscription_id=?").bind(subscription.id).first<{user_id:string;interval:string;current_end:number;event_at:number;status:string;payment_id:string}>();
 if(!local||createdAt<local.event_at)return json({ok:true});
 const current=await razorpay("/subscriptions/"+subscription.id);
 if(event.event==="subscription.charged"){
  const amount=local.interval==="monthly"?299:2499;
  if(!payment?.id||payment.status!=="captured"||payment.currency!=="USD"||payment.amount!==amount)throw new HttpError(400,"A captured payment matching the plan amount and currency is required.");
  const planId=local.interval==="monthly"?runtime().RAZORPAY_MONTHLY_PLAN_ID:runtime().RAZORPAY_YEARLY_PLAN_ID;
  if(current.plan_id!==planId||!Number.isFinite(current.current_end)||current.current_end<=0)throw new HttpError(400,"Unexpected payment plan or billing period.");
  if(local.status==="refunded"&&local.payment_id===payment.id)return json({ok:true});
  await store.batch([store.prepare("UPDATE subscriptions SET status=?,current_end=?,payment_id=?,event_at=? WHERE subscription_id=? AND event_at<=? AND NOT(status='refunded' AND payment_id=?)").bind(current.status,current.current_end,payment.id,createdAt,subscription.id,createdAt,payment.id),receipt()]);
 }else if(["subscription.cancelled","subscription.completed","subscription.halted","subscription.paused","subscription.pending","subscription.resumed","subscription.activated"].includes(event.event)){
  // Activation alone is not proof of a paid invoice; preserve entitlement until a captured charge arrives.
  const status=local.payment_id?current.status:local.status;
  await store.batch([store.prepare("UPDATE subscriptions SET status=?,event_at=? WHERE subscription_id=? AND event_at<=? AND status<>'refunded'").bind(status,createdAt,subscription.id,createdAt),receipt()]);
 }
 return json({ok:true});
});}
