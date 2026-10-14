import { body, db, handle, HttpError, json, sameOrigin } from "@/lib/server";
import { finishConnection, pendingAccounts } from "@/lib/meta";
export function GET(request: Request) {
  return handle(async () => {
    const { value } = await pendingAccounts(request);
    return json({ accounts: value.accounts.map(({ id, username, name, pictureUrl, pageName }) => ({ id, username, name, pictureUrl, pageName })) });
  });
}
export function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const { key, state, value } = await pendingAccounts(request);
    const input = await body(request), account = value.accounts.find(a => a.id === input.accountId);
    if (!account) throw new HttpError(400, "Choose an Instagram account from the list.");
    const claimed = await db().prepare("DELETE FROM oauth_pending WHERE id=? AND expires_at>? RETURNING id").bind(key, Date.now()).first();
    if (!claimed) throw new HttpError(409, "This connection has already been completed. Start sign-in again.");
    const response = await finishConnection(request, state, "facebook", account, value.subject);
    const result = json({ url: response.headers.get("location") });
    for (const cookie of response.headers.getSetCookie()) result.headers.append("Set-Cookie", cookie);
    return result;
  });
}
