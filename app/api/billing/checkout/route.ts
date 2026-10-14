import {actor,body,db,handle,HttpError,json,paid,razorpay,RazorpayError,runtime,settings} from "@/lib/server";
import {providerTimestamp} from "@/lib/billing";
import {z} from "zod";
function checkoutUrl(value:unknown){
 if(typeof value!=="string")throw new Error("Missing checkout URL");const url=new URL(value);
 if(url.protocol!=="https:"||!["rzp.io","razorpay.com"].some(d=>url.hostname===d||url.hostname.endsWith("."+d)))throw new Error("Invalid payment URL");return url.toString();
}
export function POST(request:Request){return handle(async()=>{
 const u=await actor(request,true),{interval}=z.object({interval:z.enum(["monthly","yearly"])}).parse(await body(request));
 if(!settings().payments)throw new HttpError(503,"Payment setup is not complete. No charge was made.");
 const store=db(),old=await store.prepare("SELECT * FROM subscriptions WHERE user_id=?").bind(u.userId).first<{subscription_id:string;status:string;interval:string;updated_at:number}>();
 if(old?.status==="creating"||old?.status==="checkout_uncertain")throw new HttpError(409,"An earlier checkout is being confirmed. Contact support if this persists; starting another could create duplicate billing.");
 if(await paid(u.userId))throw new HttpError(409,"You already have paid access. Manage your subscription before starting another.");
 if(old&&old.status!=="checkout_error"){
  const current=await razorpay("/subscriptions/"+old.subscription_id);
  if(["active","authenticated","pending","halted","paused"].includes(current.status))throw new HttpError(409,"You already have a subscription. Manage it before starting another.");
  if(current.status==="created"){
   if(old.interval===interval&&current.short_url&&(!current.expire_by||current.expire_by>Date.now()/1000))return json({url:checkoutUrl(current.short_url),subscriptionId:old.subscription_id});
   await razorpay("/subscriptions/"+old.subscription_id+"/cancel","POST",{cancel_at_cycle_end:0});
  }
 }
 const e=runtime(),planId=interval==="monthly"?e.RAZORPAY_MONTHLY_PLAN_ID!:e.RAZORPAY_YEARLY_PLAN_ID!,plan=await razorpay("/plans/"+planId);
 if(plan.item?.currency!=="USD"||plan.item?.amount!==(interval==="monthly"?299:2499)||plan.period!==(interval==="monthly"?"monthly":"yearly")||plan.interval!==1)throw new HttpError(503,"The configured payment plan does not match the displayed price. No charge was made.");
 const lock=crypto.randomUUID();
 // Compare the full snapshot read above. A second request cannot replace a checkout that finished while its plan lookup was pending.
 const claimed=await store.prepare("INSERT INTO subscriptions(user_id,subscription_id,interval,status,updated_at) VALUES(?,?,?,'creating',?) ON CONFLICT(user_id) DO UPDATE SET subscription_id=excluded.subscription_id,interval=excluded.interval,status='creating',updated_at=excluded.updated_at,current_start=0,current_end=0,next_charge_at=0,payment_id='',payment_status='',payment_event_at=0,event_at=0,cancel_at_end=0 WHERE subscriptions.subscription_id=? AND subscriptions.status=? AND subscriptions.updated_at=?").bind(u.userId,lock,interval,Date.now(),old?.subscription_id||"",old?.status||"",old?.updated_at||0).run();
 if(!claimed.meta.changes)throw new HttpError(409,"Checkout is already being prepared. Please wait a moment.");
 try{
  const subscription=await razorpay("/subscriptions","POST",{plan_id:planId,total_count:interval==="monthly"?1200:100,quantity:1,customer_notify:true,expire_by:Math.floor(Date.now()/1000)+86400,notes:{replylane_user_id:u.userId,replylane_interval:interval}});
  const url=checkoutUrl(subscription.short_url);if(typeof subscription.id!=="string"||!/^sub_[A-Za-z0-9]+$/.test(subscription.id))throw new Error("Missing subscription ID");
  await store.prepare("UPDATE subscriptions SET subscription_id=?,status='created',next_charge_at=?,updated_at=? WHERE user_id=? AND subscription_id=? AND status='creating'").bind(subscription.id,providerTimestamp(subscription.charge_at),Date.now(),u.userId,lock).run();
  return json({url,subscriptionId:subscription.id});
 }catch(error){
  // A provider 5xx may arrive after creation. Only explicit client rejections permit another creation attempt.
  const status=error instanceof RazorpayError&&[400,401,403,404,422,429].includes(error.providerStatus)?"checkout_error":"checkout_uncertain";
  await store.prepare("UPDATE subscriptions SET status=?,updated_at=? WHERE user_id=? AND subscription_id=?").bind(status,Date.now(),u.userId,lock).run();
  if(status==="checkout_uncertain")throw new HttpError(502,"Checkout confirmation is unavailable. Contact support before starting another checkout.");
  throw error;
 }
});}
