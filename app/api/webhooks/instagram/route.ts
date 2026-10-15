import {scheduleDelivery} from "@/lib/delivery-queue";
import {constantEqual,db,handle,hmac,HttpError,json,runtime,settings} from "@/lib/server";
import {matchRule,eligibleWindow,isOptOut,eventTimestamp} from "@/lib/rules";
import {deliverOne} from "@/lib/delivery";
export function GET(request:Request){const p=new URL(request.url).searchParams,secret=runtime().META_WEBHOOK_VERIFY_TOKEN;if(secret&&p.get("hub.mode")==="subscribe"&&constantEqual(p.get("hub.verify_token")||"",secret))return new Response(p.get("hub.challenge")||"");return json({error:"Verification failed."},403);}
export function POST(request:Request){return handle(async()=>{
 const e=runtime(),instagramSecret=e.META_WEBHOOK_APP_SECRET||e.META_APP_SECRET;
 if(!(instagramSecret||e.FACEBOOK_APP_SECRET))throw new HttpError(503,"Instagram webhook setup is not complete.");
 const raw=await request.text();if(raw.length>100000)throw new HttpError(413,"Payload too large.");
 const signature=request.headers.get("x-hub-signature-256")||"";
 const validInstagram=!!instagramSecret&&constantEqual("sha256="+await hmac(instagramSecret,raw),signature);
 const validFacebook=!!e.FACEBOOK_APP_SECRET&&constantEqual("sha256="+await hmac(e.FACEBOOK_APP_SECRET,raw),signature);
 if(!validInstagram&&!validFacebook)throw new HttpError(401,"Invalid signature.");
 let payload;try{payload=JSON.parse(raw);}catch{throw new HttpError(400,"Invalid webhook JSON.");}
 if(!payload||typeof payload!=="object")throw new HttpError(400,"Invalid webhook payload.");
 if(payload.object!=="instagram")return json({ok:true});
 if(!Array.isArray(payload.entry))throw new HttpError(400,"Webhook entries must be an array.");
 const touched=new Set<string>();
 for(const entry of payload.entry){
  const account=await db().prepare("SELECT user_id,instagram_id,provider FROM accounts WHERE instagram_id=?").bind(String(entry.id)).first<{user_id:string;instagram_id:string;provider:string}>();if(!account||(account.provider==="facebook"?!validFacebook:!validInstagram))continue;
  const changes=(Array.isArray(entry.changes)?entry.changes:[]).filter((c:Record<string,any>)=>c.field==="comments").map((c:Record<string,any>)=>({id:String(c.value?.id||""),text:String(c.value?.text||""),recipient:String(c.value?.id||""),sender:String(c.value?.from?.id||""),mediaId:String(c.value?.media?.id||""),trigger:"comment",timestamp:eventTimestamp(c.value?.created_time??entry.time)}));
  const messages=(Array.isArray(entry.messaging)?entry.messaging:[]).filter((m:Record<string,any>)=>m.message?.text&&!m.message?.is_echo&&String(m.sender?.id)!==account.instagram_id).map((m:Record<string,any>)=>({id:String(m.message.mid||""),text:String(m.message.text),recipient:String(m.sender?.id||""),sender:String(m.sender?.id||""),mediaId:"",trigger:"message",timestamp:eventTimestamp(m.timestamp)}));
  for(const event of [...changes,...messages]){
   if(!event.id||!event.recipient||!event.sender||event.sender===account.instagram_id||!eligibleWindow(event.trigger,event.timestamp))continue;
   if(event.trigger==="message"&&isOptOut(event.text)){
    await db().prepare("INSERT INTO opt_outs(user_id,recipient,created_at) VALUES(?,?,?) ON CONFLICT(user_id,recipient) DO NOTHING").bind(account.user_id,event.sender,Date.now()).run();
    continue;
   }
   if(await db().prepare("SELECT recipient FROM opt_outs WHERE user_id=? AND recipient=?").bind(account.user_id,event.sender).first())continue;
   const campaigns=await db().prepare("SELECT * FROM campaigns WHERE user_id=? AND enabled=1 AND trigger=? ORDER BY created_at,id").bind(account.user_id,event.trigger).all<Record<string,any>>();
   const selected=campaigns.results.find(c=>(!c.media_id||c.media_id===event.mediaId)&&matchRule({message:c.message,link:c.link,keywords:JSON.parse(c.keywords)},event.text).matched);if(!selected)continue;
   touched.add(account.user_id);
   await db().prepare("INSERT INTO activities(id,user_id,campaign_id,campaign_name,text,status,created_at,test,recipient,trigger,event_at,sender_id) VALUES(?,?,?,?,?,'queued',?,0,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(account.instagram_id+":"+event.trigger+":"+event.id,account.user_id,selected.id,selected.name,event.text.slice(0,1000),Date.now(),event.recipient,event.trigger,event.timestamp,event.sender).run();
  }
 }
 await deliverOne();
 if(settings().live)for(const userId of touched){const pending=await db().prepare("SELECT id FROM activities WHERE user_id=? AND test=0 AND status IN ('queued','processing') LIMIT 1").bind(userId).first();if(pending)await scheduleDelivery(userId);}
 return json({ok:true});
});}
