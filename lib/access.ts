import { db, paid } from "./server";

export type TrialKind = "owner" | "review";
type Trial = { kind: TrialKind; expires_at: number; starts_at: number; dm_limit: number; used: number };

export async function sendingAccess(userId: string, now = Date.now()) {
  const [subscription, trial] = await Promise.all([
    paid(userId),
    db().prepare("SELECT 'owner' AS kind,trial.starts_at,trial.expires_at,trial.dm_limit,trial.used FROM owner_trials trial JOIN accounts account ON account.user_id=trial.user_id AND account.instagram_id=trial.instagram_id WHERE trial.user_id=? UNION ALL SELECT 'review' AS kind,trial.starts_at,trial.expires_at,trial.dm_limit,trial.used FROM review_trials trial JOIN accounts account ON account.user_id=trial.user_id AND account.instagram_id=trial.instagram_id WHERE trial.user_id=? LIMIT 1").bind(userId,userId).first<Trial>(),
  ]);
  const limit = trial ? Math.min(25, trial.dm_limit) : 0;
  const active = !!trial && trial.starts_at <= now && trial.expires_at > now && trial.used < limit;
  return {
    mode: subscription ? "paid" as const : active ? trial.kind === "review" ? "review_trial" as const : "owner_trial" as const : "none" as const,
    canSend: subscription || active,
    trial: trial ? { kind: trial.kind, active, expiresAt: trial.expires_at, limit, used: trial.used, remaining: Math.max(0, limit - trial.used) } : null,
  };
}

export async function reserveTrial(userId: string, instagramId: string, kind: TrialKind = "owner") {
  const now = Date.now();
  const table = kind === "review" ? "review_trials" : "owner_trials";
  const result = await db().prepare(`UPDATE ${table} SET used=used+1 WHERE user_id=? AND instagram_id=? AND starts_at<=? AND expires_at>? AND used<MIN(dm_limit,25)`).bind(userId, instagramId, now, now).run();
  return !!result.meta.changes;
}

export async function releaseTrial(userId: string, kind: TrialKind = "owner") {
  const table = kind === "review" ? "review_trials" : "owner_trials";
  await db().prepare(`UPDATE ${table} SET used=MAX(0,used-1) WHERE user_id=?`).bind(userId).run();
}
