export type Rule = { keywords:string[]; message:string; link:string };
const optOut=/^\s*(stop|unsubscribe|cancel|quit|end)\s*[.!]?\s*$/iu;
export function matchRule(rule:Rule, text:string) {
 if(optOut.test(text)) return {matched:false,reason:"Opt-out keyword: no reply is sent."};
 const normalized=text.normalize("NFKC");
 const matched=rule.keywords.some(k=>{
  const escaped=k.normalize("NFKC").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`,"iu").test(normalized);
 });
 return matched?{matched:true,reason:"Keyword matched. This is a simulation; no DM was sent.",message:rule.message+(rule.link?"\n\n"+rule.link:"")}:{matched:false,reason:"None of this automation’s keywords matched."};
}
export function eligibleWindow(trigger:string, timestamp:number, now=Date.now()) {
 return Number.isFinite(timestamp)&&timestamp>0&&timestamp<=now+300000&&now-timestamp<=(trigger==="comment"?7*86400000:86400000);
}
