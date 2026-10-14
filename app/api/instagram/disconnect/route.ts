import {actor,db,decrypt,handle,json,runtime} from "@/lib/server";
import {graphHost} from "@/lib/meta";
export function POST(request:Request){return handle(async()=>{
 const u=await actor(request,true),store=db(),account=await store.prepare("SELECT instagram_id,encrypted_token,provider FROM accounts WHERE user_id=?").bind(u.userId).first<{instagram_id:string;encrypted_token:string;provider:string}>();
 await store.batch([store.prepare("UPDATE campaigns SET enabled=0 WHERE user_id=?").bind(u.userId),store.prepare("UPDATE activities SET status='skipped',reason='Instagram was disconnected.' WHERE user_id=? AND status='queued'").bind(u.userId),store.prepare("DELETE FROM accounts WHERE user_id=?").bind(u.userId)]);
 if(account){try{await fetch(`${graphHost(account.provider)}/${runtime().META_API_VERSION}/${account.instagram_id}/subscribed_apps`,{method:"DELETE",headers:{Authorization:"Bearer "+await decrypt(account.encrypted_token)},signal:AbortSignal.timeout(10000)});}catch{}}
 return json({ok:true});
});}
