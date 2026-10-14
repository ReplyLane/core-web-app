import { actor, db, decrypt, encrypt, HttpError, runtime, settings } from "./server";
import { cookieValue, createSession, hash, randomToken, setCookie } from "./auth";

export type Provider = "instagram" | "facebook";
type Intent = "login" | "connect";
type State = { user_id: string; intent: Intent; browser_hash: string };
type Token = { access_token: string; expires_in?: number };
export type Profile = { id: string; username: string; name: string; pictureUrl: string; followers: number | null; mediaCount: number | null };
export type Candidate = Profile & { pageId: string; pageName: string; token: string; expiresAt: number };
type Pending = { subject: string; name: string; accounts: Candidate[] };
const OAUTH_COOKIE = "replylane_oauth";
const PENDING_COOKIE = "replylane_pending";

export const graphHost = (provider: string) => provider === "facebook" ? "https://graph.facebook.com" : "https://graph.instagram.com";
export function appOrigin(request: Request) {
  const origin = new URL(runtime().APP_ORIGIN || request.url);
  if (origin.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new HttpError(503, "Configure a secure application origin.");
  return origin.origin;
}
export function redirectTo(request: Request, path: string, cookies: string[] = []) {
  const headers = new Headers({ Location: appOrigin(request) + path, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}
export const clearFlowCookies = (request: Request) => [setCookie(OAUTH_COOKIE, "", 0, request), setCookie(PENDING_COOKIE, "", 0, request)];
export function connectionError(request: Request, error: unknown) {
  // Never log OAuth codes, access tokens, provider responses or callback URLs.
  const code = error instanceof HttpError && error.status === 409 ? "account_conflict" : error instanceof HttpError && error.status === 422 ? "no_accounts" : "connection_failed";
  console.error("Meta connection failed", code);
  return redirectTo(request, "/?connect_error=" + code, clearFlowCookies(request));
}
export async function metaRequest<T>(url: string | URL, token?: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", "Bearer " + token);
  const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new HttpError(502, "Meta could not complete the request. Check the granted permissions and try again.");
  return await response.json() as T;
}

export async function startOAuth(request: Request, provider: Provider) {
  if (!settings()[provider]) throw new HttpError(503, `${provider === "facebook" ? "Facebook" : "Instagram"} Login setup is not complete yet.`);
  const url = new URL(request.url), intent: Intent = url.searchParams.get("intent") === "login" ? "login" : "connect";
  // Refuse cross-site starts; the callback additionally requires a browser-bound cookie.
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Start sign-in from Replylane.");
  const user = intent === "connect" ? await actor(request) : null;
  const state = randomToken(), browser = randomToken(), e = runtime();
  await db().batch([
    db().prepare("DELETE FROM oauth_states WHERE expires_at<=?").bind(Date.now()),
    db().prepare("DELETE FROM oauth_pending WHERE expires_at<=?").bind(Date.now()),
    db().prepare("INSERT INTO oauth_states(id,user_id,expires_at,provider,intent,browser_hash) VALUES(?,?,?,?,?,?)").bind(state, user?.userId || "", Date.now() + 600000, provider, intent, await hash(browser)),
  ]);
  const authorize = new URL(provider === "instagram" ? "https://www.instagram.com/oauth/authorize" : `https://www.facebook.com/${e.META_API_VERSION}/dialog/oauth`);
  authorize.search = new URLSearchParams({ client_id: provider === "instagram" ? e.META_APP_ID! : e.FACEBOOK_APP_ID!, redirect_uri: appOrigin(request) + `/api/${provider}/callback`, response_type: "code", state }).toString();
  if (provider === "instagram") { authorize.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages"); authorize.searchParams.set("enable_fb_login", "0"); }
  else authorize.searchParams.set("config_id", e.FACEBOOK_LOGIN_CONFIG_ID!);
  return new Response(null, { status: 302, headers: { Location: authorize.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Set-Cookie": setCookie(OAUTH_COOKIE, browser, 600, request) } });
}

export async function consumeState(request: Request, provider: Provider): Promise<State> {
  const state = new URL(request.url).searchParams.get("state"), browser = cookieValue(request, OAUTH_COOKIE);
  if (!state || !browser) throw new HttpError(400, "Sign-in expired. Please try again.");
  const browserHash = await hash(browser);
  const row = await db().prepare("SELECT user_id,intent,browser_hash FROM oauth_states WHERE id=? AND provider=? AND browser_hash=? AND expires_at>?").bind(state, provider, browserHash, Date.now()).first<State>();
  if (!row) throw new HttpError(400, "Sign-in expired. Please try again.");
  if (row.intent === "connect" && (await actor(request)).userId !== row.user_id) throw new HttpError(403, "Sign in to the workspace that started this connection.");
  const consumed = await db().prepare("DELETE FROM oauth_states WHERE id=? AND browser_hash=? RETURNING id").bind(state, browserHash).first();
  if (!consumed) throw new HttpError(400, "Sign-in has already been used.");
  const params = new URL(request.url).searchParams;
  if (params.has("error") || !params.get("code")) throw new HttpError(400, "Sign-in was cancelled.");
  return row;
}

export function profileFrom(value: Record<string, unknown>): Profile {
  const id = String(value.user_id || value.id || ""), username = value.username;
  if (!/^\d+$/.test(id) || typeof username !== "string" || !username) throw new HttpError(502, "Instagram did not return a professional account.");
  const count = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  return { id, username, name: typeof value.name === "string" ? value.name : username, pictureUrl: safeImage(value.profile_picture_url), followers: count(value.followers_count), mediaCount: count(value.media_count) };
}
export function safeImage(value: unknown) {
  if (typeof value !== "string") return "";
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
}
export async function instagramAccount(request: Request): Promise<Candidate> {
  const e = runtime(), form = new FormData();
  for (const [key, value] of Object.entries({ client_id: e.META_APP_ID!, client_secret: e.META_APP_SECRET!, grant_type: "authorization_code", redirect_uri: appOrigin(request) + "/api/instagram/callback", code: new URL(request.url).searchParams.get("code")! })) form.set(key, value);
  const short = await metaRequest<Token>("https://api.instagram.com/oauth/access_token", undefined, { method: "POST", body: form });
  if (!short.access_token) throw new HttpError(502, "Instagram did not return a token.");
  const url = new URL("https://graph.instagram.com/access_token");
  url.search = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: e.META_APP_SECRET!, access_token: short.access_token }).toString();
  const long = await metaRequest<Token>(url);
  if (!long.access_token || !Number.isFinite(long.expires_in) || long.expires_in! <= 0) throw new HttpError(502, "Instagram did not return a valid token expiry.");
  const profile = new URL(`https://graph.instagram.com/${e.META_API_VERSION}/me`);
  profile.searchParams.set("fields", "user_id,username,name,profile_picture_url,followers_count,media_count");
  const me = profileFrom(await metaRequest<Record<string, unknown>>(profile, long.access_token));
  return { ...me, token: long.access_token, expiresAt: Date.now() + long.expires_in! * 1000, pageId: "", pageName: "" };
}

export async function facebookAccounts(request: Request): Promise<Pending> {
  const e = runtime(), exchange = new URL(`https://graph.facebook.com/${e.META_API_VERSION}/oauth/access_token`);
  exchange.search = new URLSearchParams({ client_id: e.FACEBOOK_APP_ID!, client_secret: e.FACEBOOK_APP_SECRET!, redirect_uri: appOrigin(request) + "/api/facebook/callback", code: new URL(request.url).searchParams.get("code")! }).toString();
  const short = await metaRequest<Token>(exchange);
  if (!short.access_token) throw new HttpError(502, "Facebook did not return a token.");
  const longUrl = new URL(`https://graph.facebook.com/${e.META_API_VERSION}/oauth/access_token`);
  longUrl.search = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: e.FACEBOOK_APP_ID!, client_secret: e.FACEBOOK_APP_SECRET!, fb_exchange_token: short.access_token }).toString();
  const long = await metaRequest<Token>(longUrl);
  if (!long.access_token || !long.expires_in || long.expires_in <= 0) throw new HttpError(502, "Facebook did not return a valid token expiry.");
  const me = await metaRequest<{ id: string; name: string }>(`https://graph.facebook.com/${e.META_API_VERSION}/me?fields=id,name`, long.access_token);
  if (!/^\d+$/.test(me.id)) throw new HttpError(502, "Facebook did not return a valid identity.");
  const accounts: Candidate[] = [];
  const pages = new URL(`https://graph.facebook.com/${e.META_API_VERSION}/me/accounts`);
  pages.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}");
  pages.searchParams.set("limit", "100");
  for (let i = 0; i < 10; i++) {
    const result = await metaRequest<{ data: { id: string; name: string; access_token: string; instagram_business_account?: Record<string, unknown> }[]; paging?: { next?: string; cursors?: { after?: string } } }>(pages, long.access_token);
    if (!Array.isArray(result.data)) throw new HttpError(502, "Facebook did not return your Pages.");
    for (const page of result.data) if (page.instagram_business_account && page.access_token && /^\d+$/.test(page.id)) {
      const profile = profileFrom(page.instagram_business_account);
      if (!accounts.some(a => a.id === profile.id)) accounts.push({ ...profile, pageId: page.id, pageName: page.name, token: page.access_token, expiresAt: Date.now() + long.expires_in * 1000 });
    }
    if (!result.paging?.next) break;
    if (!result.paging.cursors?.after || i === 9) throw new HttpError(502, "Too many Pages to load. Grant access only to the Page you want to connect.");
    pages.searchParams.set("after", result.paging.cursors.after);
  }
  if (!accounts.length) throw new HttpError(422, "No professional Instagram accounts are linked to the Facebook Pages you approved.");
  return { subject: me.id, name: me.name, accounts };
}

export async function storePending(request: Request, state: State, value: Pending) {
  const id = randomToken();
  await db().prepare("INSERT INTO oauth_pending(id,user_id,intent,browser_hash,encrypted_data,expires_at) VALUES(?,?,?,?,?,?)").bind(await hash(id), state.user_id, state.intent, state.browser_hash, await encrypt(JSON.stringify(value)), Date.now() + 600000).run();
  return redirectTo(request, "/connect/facebook", [setCookie(PENDING_COOKIE, id, 600, request)]);
}
export async function pendingAccounts(request: Request) {
  const id = cookieValue(request, PENDING_COOKIE), browser = cookieValue(request, OAUTH_COOKIE);
  if (!id || !browser) throw new HttpError(401, "Sign-in expired. Start again.");
  const key = await hash(id), browserHash = await hash(browser);
  const state = await db().prepare("SELECT user_id,intent,browser_hash,encrypted_data FROM oauth_pending WHERE id=? AND browser_hash=? AND expires_at>?").bind(key, browserHash, Date.now()).first<State & { encrypted_data: string }>();
  if (!state) throw new HttpError(401, "Sign-in expired. Start again.");
  if (state.intent === "connect" && (await actor(request)).userId !== state.user_id) throw new HttpError(403, "Return to the workspace that started this connection.");
  return { key, state, value: JSON.parse(await decrypt(state.encrypted_data)) as Pending };
}

export async function finishConnection(request: Request, state: State, provider: Provider, account: Candidate, subject: string) {
  const identity = await db().prepare("SELECT user_id FROM auth_identities WHERE provider=? AND subject=?").bind(provider, subject).first<{ user_id: string }>();
  if (state.intent === "connect" && identity && identity.user_id !== state.user_id) throw new HttpError(409, "This login already belongs to another workspace.");
  const userId = state.intent === "connect" ? state.user_id : identity?.user_id || crypto.randomUUID();
  const own = await db().prepare("SELECT instagram_id FROM accounts WHERE user_id=?").bind(userId).first<{ instagram_id: string }>();
  const owner = await db().prepare("SELECT user_id FROM accounts WHERE instagram_id=?").bind(account.id).first<{ user_id: string }>();
  if (owner && owner.user_id !== userId || own && own.instagram_id !== account.id) throw new HttpError(409, "This Instagram account belongs to another workspace, or your workspace already has a different account. Use your original sign-in or disconnect first.");
  const e = runtime();
  const subscription = await metaRequest<{ success?: boolean }>(`${graphHost(provider)}/${e.META_API_VERSION}/${account.id}/subscribed_apps`, account.token, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "subscribed_fields=comments,messages" });
  if (subscription.success !== true) throw new HttpError(502, "Meta did not confirm the webhook subscription.");
  // One transaction claims the identity and account. A concurrent login cannot take ownership.
  await db().batch([
    db().prepare("INSERT INTO auth_users(id,display_name,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name").bind(userId, account.name || account.username, Date.now()),
    db().prepare("INSERT INTO auth_identities(provider,subject,user_id) VALUES(?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET user_id=CASE WHEN auth_identities.user_id=excluded.user_id THEN auth_identities.user_id ELSE NULL END").bind(provider, subject, userId),
    db().prepare("INSERT INTO accounts(user_id,instagram_id,username,encrypted_token,expires_at,provider,page_id,name,picture_url,followers,media_count) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET instagram_id=CASE WHEN accounts.instagram_id=excluded.instagram_id THEN accounts.instagram_id ELSE NULL END,username=excluded.username,encrypted_token=excluded.encrypted_token,expires_at=excluded.expires_at,provider=excluded.provider,page_id=excluded.page_id,name=excluded.name,picture_url=excluded.picture_url,followers=excluded.followers,media_count=excluded.media_count").bind(userId, account.id, account.username, await encrypt(account.token), account.expiresAt, provider, account.pageId, account.name, account.pictureUrl, account.followers, account.mediaCount),
  ]);
  const claimed = await db().prepare("SELECT user_id FROM auth_identities WHERE provider=? AND subject=?").bind(provider, subject).first<{ user_id: string }>();
  if (claimed?.user_id !== userId) throw new HttpError(409, "Sign-in is already being completed. Please try again.");
  const session = await createSession(userId, request);
  return redirectTo(request, "/?connected=1&setup=1", [...clearFlowCookies(request), session]);
}

export async function connectedAccount(request: Request) {
  const user = await actor(request);
  const account = await db().prepare("SELECT instagram_id,provider,encrypted_token,expires_at FROM accounts WHERE user_id=?").bind(user.userId).first<{ instagram_id: string; provider: Provider; encrypted_token: string; expires_at: number }>();
  if (!account || account.expires_at <= Date.now()) throw new HttpError(409, "Reconnect Instagram to load your posts.");
  return { ...account, token: await decrypt(account.encrypted_token) };
}
