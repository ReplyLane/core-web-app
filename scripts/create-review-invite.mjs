import { randomBytes, createHash } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import { createClient } from "@libsql/client";

// Write credentials only to a new private file outside the repository. Never log
// the code or put it in a URL; share it only in Meta's private reviewer instructions.
const path = process.argv[2];
if (!path?.startsWith("/private/tmp/")) throw new Error("Supply a new /private/tmp/ file for the private review invitation.");
const file = await open(path, "wx", 0o600);
const code = randomBytes(32).toString("base64url"), hash = createHash("sha256").update(code).digest("hex");
// Meta requires access codes to remain valid for a year after submission. Keep
// a 30-day preparation margin; the three claims and bounded trials still apply.
const now = Date.now(), expiresAt = now + 395 * 86400000;
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  await file.writeFile(JSON.stringify({ code, codeHash: hash, url: "https://app.replylane.si/review-access", expiresAt: new Date(expiresAt).toISOString(), maxAccounts: 3 }, null, 2) + "\n");
  await db.execute({ sql: "INSERT INTO review_invites(code_hash,created_at,expires_at,max_claims) VALUES(?,?,?,3)", args: [hash, now, expiresAt] });
  console.log(JSON.stringify({ savedTo: path, expiresAt: new Date(expiresAt).toISOString(), maxAccounts: 3, perAccountDmLimit: 25, perAccountDays: 7 }));
} catch (error) { await unlink(path); throw error; }
finally { await file.close(); db.close(); }
