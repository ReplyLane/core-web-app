import { db, paid } from "./server";

type Trial = { expires_at: number; starts_at: number; dm_limit: number; used: number };

export async function sendingAccess(userId: string, now = Date.now()) {
  const [subscription, trial] = await Promise.all([
    paid(userId),
    db().prepare("SELECT trial.starts_at,trial.expires_at,trial.dm_limit,trial.used FROM owner_trials trial JOIN accounts account ON account.user_id=trial.user_id AND account.instagram_id=trial.instagram_id WHERE trial.user_id=?").bind(userId).first<Trial>(),
  ]);
  const limit = trial ? Math.min(25, trial.dm_limit) : 0;
  const active = !!trial && trial.starts_at <= now && trial.expires_at > now && trial.used < limit;
  return {
    mode: subscription ? "paid" as const : active ? "owner_trial" as const : "none" as const,
    canSend: subscription || active,
    trial: trial ? { active, expiresAt: trial.expires_at, limit, used: trial.used, remaining: Math.max(0, limit - trial.used) } : null,
  };
}

export async function reserveTrial(userId: string, instagramId: string) {
  const now = Date.now();
  const result = await db().prepare("UPDATE owner_trials SET used=used+1 WHERE user_id=? AND instagram_id=? AND starts_at<=? AND expires_at>? AND used<MIN(dm_limit,25)").bind(userId, instagramId, now, now).run();
  return !!result.meta.changes;
}

export async function releaseTrial(userId: string) {
  await db().prepare("UPDATE owner_trials SET used=MAX(0,used-1) WHERE user_id=?").bind(userId).run();
}
