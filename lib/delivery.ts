import {db,decrypt,month,paid,runtime,settings} from "./server";
import {eligibleWindow} from "./rules";

export async function deliverOne(userId?:string) {
 if(!settings().live)return {status:"disabled"};
 const store=db(),now=Date.now();
 // Never replay a crashed send: it may already have reached Instagram.
 await store.prepare("UPDATE activities SET status='needs_review',reason='Delivery worker stopped before confirmation. Review before retrying.' WHERE status='processing' AND attempt_at<?"+(userId?" AND user_id=?":"")).bind(now-120000,...(userId?[userId]:[])).run();
 const row=await store.prepare("SELECT activity.* FROM activities activity LEFT JOIN accounts account ON account.user_id=activity.user_id WHERE activity.status='queued' AND activity.test=0 AND COALESCE(account.next_send_at,0)<=?"+(userId?" AND activity.user_id=?":"")+" ORDER BY activity.created_at,activity.id LIMIT 1").bind(now,...(userId?[userId]:[])).first<Record<string,any>>();
 if(!row)return {status:"empty"};
 const claimed=await store.prepare("UPDATE activities SET status='processing',attempt_at=? WHERE id=? AND status='queued'").bind(now,row.id).run();
 if(!claimed.meta.changes)return {status:"busy"};
 const finish=async(status:string,reason:string)=>{await store.prepare("UPDATE activities SET status=?,reason=? WHERE id=? AND status='processing'").bind(status,reason,row.id).run();return {status};};
 const campaign=await store.prepare("SELECT * FROM campaigns WHERE id=? AND user_id=? AND enabled=1").bind(row.campaign_id,row.user_id).first<Record<string,any>>();
 if(!campaign)return finish("skipped","Automation is paused or deleted.");
 if(!eligibleWindow(row.trigger,row.event_at))return finish("expired","Instagram’s reply window has expired.");
 const optOut=await store.prepare("SELECT recipient FROM opt_outs WHERE user_id=? AND recipient=?").bind(row.user_id,row.sender_id).first();
 if(optOut)return finish("skipped","This person opted out of automated replies.");
 if(!await paid(row.user_id))return finish("skipped","A paid subscription is required.");
 const account=await store.prepare("SELECT * FROM accounts WHERE user_id=?").bind(row.user_id).first<Record<string,any>>();
 if(!account||account.expires_at<=now)return finish("skipped","Reconnect Instagram.");
 let token:string;try{token=await decrypt(account.encrypted_token);}catch{return finish("failed","The account token could not be read. Reconnect Instagram.");}
 const pace=await store.prepare("UPDATE accounts SET next_send_at=? WHERE user_id=? AND next_send_at<=?").bind(now+18000,row.user_id,now).run();
 if(!pace.meta.changes)return finish("queued","Waiting for the account’s next sending slot.");
 const billingMonth=month();
 await store.prepare("INSERT INTO usage(user_id,month,sent) VALUES(?,?,0) ON CONFLICT(user_id,month) DO NOTHING").bind(row.user_id,billingMonth).run();
 const quota=await store.prepare("UPDATE usage SET sent=sent+1 WHERE user_id=? AND month=? AND sent<1000").bind(row.user_id,billingMonth).run();
 if(!quota.meta.changes)return finish("limit_reached","Monthly allowance reached. No overage charge.");
 try {
  const response=await fetch(`https://graph.instagram.com/${runtime().META_API_VERSION}/${account.instagram_id}/messages`,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({recipient:row.trigger==="comment"?{comment_id:row.recipient}:{id:row.recipient},message:{text:campaign.message+(campaign.link?"\n\n"+campaign.link:"")}}),signal:AbortSignal.timeout(12000)});
  if(!response.ok){
   // Server errors have ambiguous outcomes; retain the reservation and require review.
   if(response.status>=500)return finish("needs_review","Instagram returned a server error. Not retried; allowance is reserved.");
   await store.prepare("UPDATE usage SET sent=MAX(0,sent-1) WHERE user_id=? AND month=?").bind(row.user_id,billingMonth).run();
   return finish("failed",`Instagram rejected the message (${response.status}).`);
  }
  return finish("sent","Instagram accepted the message.");
 } catch {return finish("needs_review","Delivery confirmation is unavailable. Not retried to avoid duplicate DMs; allowance is reserved.");}
}
