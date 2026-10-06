import {actor,constantEqual,handle,HttpError,json,runtime} from "@/lib/server";
import {deliverOne} from "@/lib/delivery";
export function POST(request:Request){return handle(async()=>{const secret=runtime().DELIVERY_WORKER_SECRET;const supplied=request.headers.get("authorization")||"";if(secret&&constantEqual(supplied,"Bearer "+secret))return json(await deliverOne());if(supplied)throw new HttpError(401,"Invalid worker credential.");const u=await actor(request,true);return json(await deliverOne(u.userId));});}
