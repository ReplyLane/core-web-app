import { env } from "cloudflare:workers";
import { z } from "zod";
import { sessionUser } from "./auth";
import { hasPaidAccess } from "./billing";
export type Runtime={DB?:D1Database;AUTH_MODE?:string;APP_ORIGIN?:string;META_APP_ID?:string;META_APP_SECRET?:string;META_WEBHOOK_APP_SECRET?:string;FACEBOOK_APP_ID?:string;FACEBOOK_APP_SECRET?:string;FACEBOOK_LOGIN_CONFIG_ID?:string;META_WEBHOOK_VERIFY_TOKEN?:string;TOKEN_ENCRYPTION_KEY?:string;META_API_VERSION?:string;LIVE_DELIVERY_ENABLED?:string;RAZORPAY_KEY_ID?:string;RAZORPAY_KEY_SECRET?:string;RAZORPAY_WEBHOOK_SECRET?:string;RAZORPAY_MONTHLY_PLAN_ID?:string;RAZORPAY_YEARLY_PLAN_ID?:string;DELIVERY_WORKER_SECRET?:string};
export const runtime=()=>env as unknown as Runtime;
export const settings=()=>{const e=runtime();const common=!!(e.APP_ORIGIN&&/^v\d+\.\d+$/.test(e.META_API_VERSION||"")&&e.TOKEN_ENCRYPTION_KEY);return {instagram:common&&!!(e.META_APP_ID&&e.META_APP_SECRET),facebook:common&&!!(e.FACEBOOK_APP_ID&&e.FACEBOOK_APP_SECRET&&e.FACEBOOK_LOGIN_CONFIG_ID),payments:!!(e.RAZORPAY_KEY_ID&&e.RAZORPAY_KEY_SECRET&&e.RAZORPAY_WEBHOOK_SECRET&&e.RAZORPAY_MONTHLY_PLAN_ID&&e.RAZORPAY_YEARLY_PLAN_ID),live:e.LIVE_DELIVERY_ENABLED==="true"&&!!(e.META_WEBHOOK_VERIFY_TOKEN&&(e.META_WEBHOOK_APP_SECRET||e.META_APP_SECRET||e.FACEBOOK_APP_SECRET)&&e.META_API_VERSION&&e.TOKEN_ENCRYPTION_KEY&&e.APP_ORIGIN)};};
export function db(){const d=runtime().DB;if(!d)throw new Error("Your workspace storage is not available yet. Please try again shortly.");return d;}
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export async function currentUser(request:Request){
 const session=await sessionUser(request);if(session)return session;
 if(runtime().AUTH_MODE!=="hosting")return null;
 const userId=request.headers.get("oai-authenticated-user-id"), email=request.headers.get("oai-authenticated-user-email");
 let fullName:string|null=null;const encodedName=request.headers.get("oai-authenticated-user-full-name");if(encodedName&&request.headers.get("oai-authenticated-user-full-name-encoding")==="percent-encoded-utf-8"){try{fullName=decodeURIComponent(encodedName);}catch{}}
 const u=userId&&email?{userId,email,fullName,displayName:fullName||email}:null;
 return u;
}
export function sameOrigin(request:Request){
 const origin=request.headers.get("origin"),expected=runtime().APP_ORIGIN||new URL(request.url).origin;
 if(!origin||origin!==expected)throw new HttpError(403,"A same-origin request is required.");
}
export async function actor(request:Request,write=false){
 const u=await currentUser(request);
 if(!u)throw new HttpError(401,"Sign in to access your workspace.");
 if(write)sameOrigin(request);
 return u;
}
export async function body(request:Request){const text=await request.text();if(text.length>12000)throw new HttpError(413,"That request is too large.");try{const value=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Expected object");return value;}catch{throw new HttpError(400,"Please submit valid JSON.");}}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{"Cache-Control":"no-store"}});}
export async function handle(action:()=>Promise<Response>){try{return await action();}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);if(e instanceof z.ZodError)return json({error:e.issues[0]?.message||"Check the form and try again."},400);console.error("Workspace action failed",e instanceof Error?e.name:"Error");return json({error:"Couldn’t complete that action. Your input is preserved; please try again."},503);}}
export const campaignSchema=z.object({name:z.string().trim().min(1,"Give your automation a name.").max(80),trigger:z.enum(["comment","message"]),keywords:z.array(z.string().trim().min(1).max(40)).min(1,"Add at least one keyword.").max(12),message:z.string().trim().min(1,"Write your reply.").max(800),link:z.string().trim().max(240).refine(v=>!v||(/^https:\/\//i.test(v)&&(()=>{try{return !!new URL(v).hostname;}catch{return false;}})()),"Use a valid HTTPS link."),mediaId:z.string().trim().max(40).regex(/^\d*$/,"Media IDs contain only numbers.")}).refine(v=>new TextEncoder().encode(v.message+(v.link?"\n\n"+v.link:"")).length<=1000,"Keep your reply and link under 1,000 bytes; emojis use extra space.");
export function toCampaign(r:Record<string,unknown>){return {id:r.id,name:r.name,trigger:r.trigger,keywords:JSON.parse(String(r.keywords)),message:r.message,link:r.link,mediaId:r.media_id,enabled:!!r.enabled,createdAt:r.created_at};}
export const month=()=>new Date().toISOString().slice(0,7);
export async function paid(userId:string){const s=await db().prepare("SELECT status,current_end FROM subscriptions WHERE user_id=?").bind(userId).first<{status:string;current_end:number}>();return !!s&&hasPaidAccess(s);}
export async function hmac(secret:string,value:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
export function constantEqual(a:string,b:string){if(a.length!==b.length)return false;let different=0;for(let i=0;i<a.length;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);return different===0;}
async function tokenKey(){const raw=runtime().TOKEN_ENCRYPTION_KEY;if(!raw)throw new Error("Token key missing");const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));if(bytes.length!==32)throw new Error("Token key must be 32 bytes");return crypto.subtle.importKey("raw",bytes,"AES-GCM",false,["encrypt","decrypt"]);}
export async function encrypt(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await tokenKey(),new TextEncoder().encode(value));return btoa(String.fromCharCode(...iv))+"."+btoa(String.fromCharCode(...new Uint8Array(encrypted)));}
export async function decrypt(value:string){const [nonce,payload]=value.split(".");const iv=Uint8Array.from(atob(nonce),c=>c.charCodeAt(0));const bytes=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv},await tokenKey(),bytes));}
export class RazorpayError extends HttpError{constructor(public providerStatus:number){super(502,"The payment provider couldn’t complete the request. Please try again.");}}
type RazorpayEntity={id:string;status:string;plan_id?:string;short_url?:string;current_start?:number|null;current_end?:number|null;charge_at?:number|null;expire_by?:number|null;remaining_count?:number;item?:{currency:string;amount:number};period?:string;interval?:number;currency?:string;amount?:number;amount_refunded?:number};
export async function razorpay(path:string,method="GET",payload?:unknown){const e=runtime();if(!e.RAZORPAY_KEY_ID||!e.RAZORPAY_KEY_SECRET)throw new HttpError(503,"Payment setup is not complete. No charge was made.");const r=await fetch("https://api.razorpay.com/v1"+path,{method,headers:{Authorization:"Basic "+btoa(e.RAZORPAY_KEY_ID+":"+e.RAZORPAY_KEY_SECRET),"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw new RazorpayError(r.status);return r.json() as Promise<RazorpayEntity>;}
