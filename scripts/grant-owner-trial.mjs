import { createClient } from "@libsql/client";

const instagramId = process.argv[2];
if (!/^\d+$/.test(instagramId || "")) throw new Error("Supply the verified @reply.lane Instagram account ID.");
const db = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});
try {
  const now = Date.now();
  // One grant only: reconnects, repeated runs and expiry cannot reset the allowance.
  await db.execute({sql: "INSERT INTO owner_trials(user_id,instagram_id,starts_at,expires_at,dm_limit,used) SELECT user_id,instagram_id,?,?,25,0 FROM accounts WHERE instagram_id=? AND username='reply.lane' ON CONFLICT DO NOTHING", args: [now, now + 7 * 86400000, instagramId]});
  const trial = (await db.execute({sql: "SELECT trial.expires_at,trial.dm_limit,trial.used FROM owner_trials trial JOIN accounts account ON account.user_id=trial.user_id AND account.instagram_id=trial.instagram_id WHERE trial.instagram_id=? AND account.username='reply.lane'", args: [instagramId]})).rows[0];
  if (!trial) throw new Error("The verified owner account was not found; no trial was granted.");
  console.log(JSON.stringify({account: "@reply.lane", expiresAt: new Date(trial.expires_at).toISOString(), limit: trial.dm_limit, used: trial.used}));
} finally { db.close(); }
