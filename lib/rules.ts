export type Rule = { keywords:string[]; message:string; link:string };
const optOut=/^\s*(stop|unsubscribe|cancel|quit|end)\s*[.!]?\s*$/iu;
export const isOptOut=(text:string)=>optOut.test(text.normalize("NFKC"));
export function eventTimestamp(value:unknown) { if(typeof value==="string"&&!/^\d+(\.\d+)?$/.test(value))return Date.parse(value);const n=Number(value);return n<100000000000?n*1000:n; }
export function matchedKeyword(keywords:string[], text:string) {
 if(isOptOut(text)) return "";
 const normalized=text.normalize("NFKC");
 return keywords.find(k=>{
  const escaped=k.normalize("NFKC").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`,"iu").test(normalized);
 })||"";
}
export function matchRule(rule:Rule, text:string) {
 if(isOptOut(text)) return {matched:false,reason:"Opt-out keyword: no reply is sent."};
 const matched=!!matchedKeyword(rule.keywords,text);
 return matched?{matched:true,reason:"Keyword matched. This is a simulation; no DM was sent.",message:rule.message+(rule.link?"\n\n"+rule.link:"")}:{matched:false,reason:"None of this automation’s keywords matched."};
}
export function eligibleWindow(trigger:string, timestamp:number, now=Date.now()) {
 return Number.isFinite(timestamp)&&timestamp>0&&timestamp<=now+300000&&now-timestamp<=(trigger==="comment"?7*86400000:86400000);
}
