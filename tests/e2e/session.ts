import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import type { BrowserContext } from "@playwright/test";

// Seed a real server session through the local test database. No mock-login
// endpoint or test credentials are exposed by the application.
export const testUser = "e2e_social_" + process.pid;
function database() {
  const path = resolve(process.env.E2E_DATABASE_PATH || ".sites-runtime/replylane.db");
  if (!existsSync(path)) throw new Error("Apply local migrations with npm run db:migrate before browser tests.");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout=5000");
  return db;
}
export async function signIn(context: BrowserContext) {
  const token = randomBytes(32).toString("hex"), db = database();
  try {
    db.prepare("INSERT INTO auth_users(id,display_name,created_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING").run(testUser, "Test Creator", Date.now());
    db.prepare("INSERT INTO auth_sessions(id,user_id,expires_at) VALUES(?,?,?)").run(createHash("sha256").update(token).digest("hex"), testUser, Date.now()+3600000);
  } finally { db.close(); }
  await context.addCookies([{ name:"replylane_session", value:token, url:process.env.E2E_BASE_URL||"http://127.0.0.1:5173", httpOnly:true, sameSite:"Lax" }]);
}
export function seedProfile() {
  const db=database();try { db.prepare("INSERT INTO accounts(user_id,instagram_id,username,encrypted_token,expires_at,name,followers,media_count) VALUES(?,?,?,?,?,?,?,?)").run(testUser, "9900"+process.pid, "test_creator", "test-only-unused-token", Date.now()+86400000, "Test Creator", 1234, 12); } finally { db.close(); }
}
export function clearProfile() { const db=database();try { db.prepare("DELETE FROM accounts WHERE user_id=?").run(testUser); } finally { db.close(); } }
export function cleanUp() {
  const db=database();try { for(const table of ["auth_sessions","auth_identities","accounts","campaigns","activities","usage","opt_outs"])db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(testUser);db.prepare("DELETE FROM auth_users WHERE id=?").run(testUser); } finally { db.close(); }
}
