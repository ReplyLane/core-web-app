import { db, runtime } from "./server";

const SESSION_AGE = 30 * 86400;
export const SESSION_COOKIE = "replylane_session";
export type User = { userId: string; email: string; fullName: string | null; displayName: string };

export function cookieValue(request: Request, name: string) {
  const values = (request.headers.get("cookie") || "").split(";").map(v => v.trim()).filter(v => v.startsWith(name + "="));
  return values.length === 1 ? values[0].slice(name.length + 1) : "";
}

export async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, "0")).join("");
}

export const randomToken = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

export function setCookie(name: string, value: string, maxAge: number, request: Request) {
  const secure = new URL(runtime().APP_ORIGIN || request.url).protocol === "https:";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export async function sessionUser(request: Request): Promise<User | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await db().prepare("SELECT u.id,u.display_name FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?").bind(await hash(token), Date.now()).first<{ id: string; display_name: string }>();
  return row ? { userId: row.id, email: "", fullName: row.display_name, displayName: row.display_name } : null;
}

export async function createSession(userId: string, request: Request) {
  const token = randomToken();
  await db().batch([
    db().prepare("DELETE FROM auth_sessions WHERE id=?").bind(await hash(cookieValue(request, SESSION_COOKIE))),
    db().prepare("DELETE FROM auth_sessions WHERE expires_at<=?").bind(Date.now()),
    db().prepare("INSERT INTO auth_sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(await hash(token), userId, Date.now() + SESSION_AGE * 1000),
  ]);
  return setCookie(SESSION_COOKIE, token, SESSION_AGE, request);
}
