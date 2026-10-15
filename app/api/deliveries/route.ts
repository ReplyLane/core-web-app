import {actor,constantEqual,handle,HttpError,json,runtime} from "@/lib/server";
import {deliverOne} from "@/lib/delivery";
import {scheduleDelivery} from "@/lib/delivery-queue";
export function POST(request:Request){return handle(async()=>{
 const secret=runtime().DELIVERY_WORKER_SECRET,supplied=request.headers.get("authorization")||"";
 let userId:string|undefined;
 if(!(secret&&constantEqual(supplied,"Bearer "+secret))){if(supplied)throw new HttpError(401,"Invalid worker credential.");userId=(await actor(request,true)).userId;}
 const result=await deliverOne(userId);
 const runId=await scheduleDelivery(userId);
 return json({...result,...(runId?{runId}:{})});
});}
