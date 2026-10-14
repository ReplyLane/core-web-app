import { handle } from "@/lib/server";
import { startOAuth } from "@/lib/meta";
export function GET(request: Request) { return handle(() => startOAuth(request, "facebook")); }
