import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto, createHmac } from 'node:crypto';

const root=resolve(import.meta.dirname,'../..');
const require=createRequire(import.meta.url);
export function fixture({configured=true,fetch:providerFetch}={}) {
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync(resolve(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(resolve(root,'drizzle',f),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(column){const row=sqlite.prepare(sql).get(...args);return row?(column?row[column]:{...row}):null;},async all(){return {results:sqlite.prepare(sql).all(...args).map(r=>({...r})),success:true};},async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const env={DB,AUTH_MODE:'hosting',APP_ORIGIN:'https://app.test',LIVE_DELIVERY_ENABLED:configured?'true':'false',...(configured?{META_APP_ID:'test-app',META_APP_SECRET:'test-meta-secret',META_API_VERSION:'v24.0',META_WEBHOOK_VERIFY_TOKEN:'test-verify',TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),RAZORPAY_KEY_ID:'test-key',RAZORPAY_KEY_SECRET:'test-payment-secret',RAZORPAY_WEBHOOK_SECRET:'test-hook-secret',RAZORPAY_MONTHLY_PLAN_ID:'plan_monthly',RAZORPAY_YEARLY_PLAN_ID:'plan_yearly',DELIVERY_WORKER_SECRET:'test-worker-secret'}:{})};
 const calls=[];const subscriptions=new Map(),payments=new Map();let serial=0;const overrides={};
 const provider=async(url,options={})=>{calls.push({url:String(url),method:options.method||'GET',body:options.body,headers:options.headers});if(providerFetch)return providerFetch(url,options);const u=new URL(url),path=u.pathname;
  if(u.hostname==='api.razorpay.com'){
   if(path.startsWith('/v1/payments/')){const payment=payments.get(path.split('/')[3]);return Response.json(payment||{error:'not found'},{status:payment?200:404});}
   if(path.startsWith('/v1/plans/')){const yearly=path.endsWith('plan_yearly');if(typeof overrides.plan==='function')return overrides.plan(url,options);return Response.json(overrides.plan||{id:yearly?'plan_yearly':'plan_monthly',item:{amount:yearly?2499:299,currency:'USD'},period:yearly?'yearly':'monthly',interval:1});}
   if(path==='/v1/subscriptions'){if(overrides.create) return overrides.create(url,options);const body=JSON.parse(options.body);const s={id:'sub_'+(++serial),short_url:'https://rzp.io/test/'+serial,status:'created',plan_id:body.plan_id,current_end:Math.floor(Date.now()/1000)+2678400};subscriptions.set(s.id,s);return Response.json(s);}
   const id=path.split('/')[3],s=subscriptions.get(id);if(s){if(path.endsWith('/cancel')){const atEnd=JSON.parse(options.body).cancel_at_cycle_end;if(!atEnd)s.status='cancelled';return Response.json(s);}return Response.json(s);}
   return Response.json({error:'not found'},{status:404});
  }
  if(u.hostname==='graph.facebook.com'&&path.endsWith('/oauth/access_token'))return Response.json(overrides.facebookToken||{access_token:'facebook-user-token',expires_in:5184000});
  if(path.endsWith('/me/accounts'))return Response.json(overrides.facebookPages||{data:[{id:'30001',name:'Creator Page',access_token:'facebook-page-token',instagram_business_account:{id:'10001',username:'test_creator',name:'Test Creator',followers_count:123,media_count:7}}]});
  if(path.endsWith('/media'))return Response.json(overrides.media||{data:[{id:'90001',caption:'My guide',media_type:'IMAGE',media_url:'https://example.com/post.jpg',permalink:'https://instagram.com/p/test/'}]});
  if(u.hostname==='api.instagram.com')return Response.json({access_token:'short-token',user_id:'10001'});
  if(path==='/access_token')return Response.json({access_token:'long-token',expires_in:5184000});
  if(path.endsWith('/me'))return Response.json(u.hostname==='graph.facebook.com'?(overrides.facebookMe||{id:'50001',name:'Facebook Creator'}):(overrides.profile||{user_id:'10001',username:'test_creator',name:'Test Creator',followers_count:123,media_count:7}));
  if(path.endsWith('/subscribed_apps'))return typeof overrides.subscribe==='function'?overrides.subscribe(url,options):overrides.subscribe?Response.json({error:'denied'},{status:403}):Response.json({success:true});
  if(path.endsWith('/messages')){if(overrides.send)return overrides.send(url,options);return Response.json({message_id:'mid_'+calls.length});}
  throw new Error('Unexpected provider request: '+u.hostname+path);
 };
 const cache=new Map();
 function load(name){const path=name.startsWith('@/')?resolve(root,name.slice(2)+'.ts'):resolve(root,name);if(cache.has(path))return cache.get(path).exports;const compiledModule={exports:{}};cache.set(path,compiledModule);const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const sandbox={module:compiledModule,exports:compiledModule.exports,require(spec){if(spec==='cloudflare:workers')return {env};if(spec.startsWith('@/'))return load(spec);if(spec.startsWith('.'))return load(resolve(dirname(path),spec+'.ts'));return require(spec);},process:{env:{NODE_ENV:'production'}},fetch:provider,crypto:webcrypto,Request,Response,Headers,URL,URLSearchParams,FormData,TextEncoder,TextDecoder,Uint8Array,AbortSignal,Buffer,console:{error(){}},atob,btoa,setTimeout,clearTimeout};vm.runInNewContext(source,sandbox,{filename:path});return compiledModule.exports;
 }
 async function request(path,{method='GET',data,user='alice',origin=env.APP_ORIGIN,headers={},raw}={}){const h={...headers};if(user){h['oai-authenticated-user-id']=user;h['oai-authenticated-user-email']=user+'@test.example';}if(origin)h.origin=origin;if(data!==undefined)h['content-type']='application/json';const req=new Request(env.APP_ORIGIN+path,{method,headers:h,body:raw??(data===undefined?undefined:JSON.stringify(data))});const route=load('app'+new URL(env.APP_ORIGIN+path).pathname+'/route.ts');return route[method](req);}
 const rows=(sql,...args)=>sqlite.prepare(sql).all(...args).map(r=>({...r}));
 const run=(sql,...args)=>sqlite.prepare(sql).run(...args);
 async function account(user='alice',instagramId='10001'){const token=await load('lib/server.ts').encrypt('long-token');run('INSERT INTO accounts(user_id,instagram_id,username,encrypted_token,expires_at) VALUES(?,?,?,?,?)',user,instagramId,user+'_creator',token,Date.now()+86400000);}
 function paid(user='alice'){const id='sub_'+user;subscriptions.set(id,{id,status:'active',plan_id:'plan_monthly',current_end:Math.floor(Date.now()/1000)+2678400});run("INSERT INTO subscriptions(user_id,subscription_id,interval,status,current_end) VALUES(?,?,'monthly','active',?)",user,id,Math.floor(Date.now()/1000)+2678400);}
 const sign=(payload,provider='instagram')=>{const raw=typeof payload==='string'?payload:JSON.stringify(payload);return {raw,headers:provider==='instagram'?{'x-hub-signature-256':'sha256='+createHmac('sha256',env.META_WEBHOOK_APP_SECRET||env.META_APP_SECRET).update(raw).digest('hex')}:{'x-razorpay-signature':createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex')}};};
 return {env,load,request,rows,run,account,paid,calls,overrides,subscriptions,payments,sign,close:()=>sqlite.close()};
}
export const campaign={name:'Send guide',trigger:'comment',keywords:['LINK'],message:'Here is your guide',link:'https://creator.example/guide',mediaId:''};
export const comment=(id='comment_1',account='10001',text='LINK',sender='20001')=>({object:'instagram',entry:[{id:account,time:Math.floor(Date.now()/1000),changes:[{field:'comments',value:{id,text,from:{id:sender},media:{id:'90001'}}}]}]});
export const message=(id='mid_1',account='10001',text='LINK',sender='20001')=>({object:'instagram',entry:[{id:account,messaging:[{sender:{id:sender},recipient:{id:account},timestamp:Date.now(),message:{mid:id,text}}]}]});
