import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const path = process.argv[2];
if (!path?.startsWith("/private/tmp/")) throw new Error("Supply the private invitation file created by create-review-invite.mjs.");
const { codeHash } = JSON.parse(await readFile(path, "utf8"));
if (!/^[a-f0-9]{64}$/.test(codeHash || "")) throw new Error("Invalid invitation file.");
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  const now = Date.now();
  const results = await db.batch([
    { sql: "UPDATE review_invites SET expires_at=MIN(expires_at,?) WHERE code_hash=?", args: [now, codeHash] },
    { sql: "UPDATE review_trials SET expires_at=MIN(expires_at,?) WHERE invite_hash=?", args: [now, codeHash] },
  ], "write");
  console.log(JSON.stringify({ revokedInvitations: results[0].rowsAffected, expiredTrials: results[1].rowsAffected }));
} finally { db.close(); }
