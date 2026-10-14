import {actor,db,handle,HttpError,json,razorpay} from "@/lib/server";
import {billingSnapshot,hasPaidAccess,type BillingRecord} from "@/lib/billing";
export function POST(request:Request){return handle(async()=>{
 const u=await actor(request,true),store=db();
 const subscription=await store.prepare("SELECT * FROM subscriptions WHERE user_id=?").bind(u.userId).first<BillingRecord>();
 if(!subscription)throw new HttpError(409,"There is no subscription to cancel.");
 if(subscription.cancel_at_end)return json({ok:true});
 if(!billingSnapshot(subscription)?.canCancel)throw new HttpError(409,"There is no renewable subscription to cancel.");
 const current=await razorpay("/subscriptions/"+subscription.subscription_id);
 if(["cancelled","completed","expired"].includes(current.status)){
  await store.prepare("UPDATE subscriptions SET status=?,cancel_at_end=1,next_charge_at=0,updated_at=? WHERE user_id=? AND subscription_id=?").bind(subscription.status==="refunded"?"refunded":current.status,Date.now(),u.userId,subscription.subscription_id).run();
  return json({ok:true});
 }
 const atEnd=current.status==="active"&&hasPaidAccess(subscription)&&current.remaining_count!==0;
 const result=await razorpay("/subscriptions/"+subscription.subscription_id+"/cancel","POST",{cancel_at_cycle_end:atEnd?1:0});
 if(result.id!==subscription.subscription_id||!(atEnd?["active","cancelled"].includes(result.status):result.status==="cancelled"))throw new HttpError(502,"The payment provider has not confirmed cancellation. Refresh your status and try again.");
 await store.prepare("UPDATE subscriptions SET status=?,cancel_at_end=1,next_charge_at=0,updated_at=? WHERE user_id=? AND subscription_id=?").bind(subscription.status==="refunded"?"refunded":result.status,Date.now(),u.userId,subscription.subscription_id).run();
 return json({ok:true});
});}
