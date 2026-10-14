import { cookieValue, hash, SESSION_COOKIE, setCookie } from "@/lib/auth";
import { db, handle, json, sameOrigin } from "@/lib/server";
export function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const token = cookieValue(request, SESSION_COOKIE);
    if (token) await db().prepare("DELETE FROM auth_sessions WHERE id=?").bind(await hash(token)).run();
    const response = json({ ok: true });
    response.headers.set("Set-Cookie", setCookie(SESSION_COOKIE, "", 0, request));
    return response;
  });
}
