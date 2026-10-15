import { hash } from "@/lib/auth";
import { actor, body, db, handle, HttpError, json } from "@/lib/server";
import { sendingAccess } from "@/lib/access";
import { z } from "zod";

const invitation = z.object({ code: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/, "Enter the complete review invitation code.") });

export function POST(request: Request) {
  return handle(async () => {
    const user = await actor(request, true);
    const { code } = invitation.parse(await body(request));
    const codeHash = await hash(code), now = Date.now();
    const store = db();
    const account = await store.prepare("SELECT instagram_id,expires_at FROM accounts WHERE user_id=?").bind(user.userId).first<{ instagram_id: string; expires_at: number }>();
    if (!account || account.expires_at <= now) throw new HttpError(409, "Connect Instagram before using a review invitation.");
    // One atomic write enforces the invitation cap, account binding and one lifetime
    // grant per workspace/account. Reconnection or a second invitation cannot reset it.
    await store.prepare(`INSERT INTO review_trials(user_id,instagram_id,invite_hash,starts_at,expires_at,dm_limit,used)
      SELECT ?,?,?,?,MIN(?,invite.expires_at),25,0 FROM review_invites invite
      WHERE invite.code_hash=? AND invite.created_at<=? AND invite.expires_at>?
      AND (SELECT COUNT(*) FROM review_trials WHERE invite_hash=invite.code_hash)<MIN(invite.max_claims,3)
      AND NOT EXISTS(SELECT 1 FROM owner_trials WHERE user_id=? OR instagram_id=?)
      ON CONFLICT DO NOTHING`).bind(user.userId,account.instagram_id,codeHash,now,now+7*86400000,codeHash,now,now,user.userId,account.instagram_id).run();
    const grant = await store.prepare("SELECT user_id FROM review_trials WHERE user_id=? AND instagram_id=? AND invite_hash=?").bind(user.userId,account.instagram_id,codeHash).first();
    if (!grant) throw new HttpError(409, "This invitation is unavailable, or this account has already received test access. Contact hello@replylane.si for help.");
    return json({ access: await sendingAccess(user.userId) });
  });
}
