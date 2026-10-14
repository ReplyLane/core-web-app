export type BillingRecord = {
 user_id:string; subscription_id:string; interval:string; status:string;
 current_start:number; current_end:number; next_charge_at:number; cancel_at_end:number;
 updated_at:number; payment_id:string; payment_status:string; payment_event_at:number; event_at:number;
};

export function hasPaidAccess(subscription:Pick<BillingRecord,"status"|"current_end">,now=Date.now()) {
 return ["active","cancelled","completed"].includes(subscription.status)&&subscription.current_end*1000>now;
}

export function billingSnapshot(subscription:BillingRecord|null,now=Date.now()) {
 if(!subscription)return null;
 const subscriptionId=/^sub_[A-Za-z0-9]+$/.test(subscription.subscription_id)?subscription.subscription_id:null;
 const cancelAtEnd=!!subscription.cancel_at_end;
 return {
  status:subscription.status,interval:subscription.interval,subscriptionId,
  currentStart:subscription.current_start,currentEnd:subscription.current_end,
  nextChargeAt:cancelAtEnd||["cancelled","completed","expired"].includes(subscription.status)?0:subscription.next_charge_at,
  cancelAtEnd,paymentId:subscription.payment_id||null,
  paymentStatus:subscription.payment_status||(subscription.status==="refunded"?"refunded":subscription.payment_id?"captured":"awaiting_payment"),
  updatedAt:subscription.updated_at,hasPaidAccess:hasPaidAccess(subscription,now),
  canResumeCheckout:subscription.status==="created"&&!!subscriptionId,
  canCancel:!!subscriptionId&&!cancelAtEnd&&["created","authenticated","active","pending","halted","paused","refunded"].includes(subscription.status),
 };
}

export function providerTimestamp(value:unknown) {
 return typeof value==="number"&&Number.isSafeInteger(value)&&value>0?value:0;
}
