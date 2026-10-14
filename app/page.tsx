import Workspace from "./workspace";
import { headers } from "next/headers";
import { currentUser, runtime, settings } from "@/lib/server";
import Login from "./login";
import LandingPage from "@/components/landing-page";
export const dynamic="force-dynamic";
export default async function Home() {
 const requestHeaders=await headers();
 const hostname=(requestHeaders.get("host")||"").replace(/:\d+$/,"").toLowerCase();
 if(hostname==="replylane.si"||hostname==="www.replylane.si")return <LandingPage/>;
 const user = await currentUser(new Request(runtime().APP_ORIGIN || "http://localhost:5173", { headers: requestHeaders }));
 if (!user) { const configured = settings(); return <Login instagram={configured.instagram} facebook={configured.facebook}/>; }
 return <Workspace />;
}
