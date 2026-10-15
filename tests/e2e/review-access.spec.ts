import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { signIn, seedProfile, cleanUp } from "./session";

const code="R".repeat(43), hash=createHash("sha256").update(code).digest("hex");
test.afterEach(()=>{
 cleanUp();const db=new DatabaseSync(resolve(process.env.E2E_DATABASE_PATH||".sites-runtime/replylane.db"));
 try{db.prepare("DELETE FROM review_invites WHERE code_hash=?").run(hash);}finally{db.close();}
});

test("a signed-in reviewer can redeem an invitation and see the bounded allowance",async({page,context})=>{
 await signIn(context);seedProfile();
 const db=new DatabaseSync(resolve(process.env.E2E_DATABASE_PATH||".sites-runtime/replylane.db"));
 try{db.prepare("INSERT INTO review_invites VALUES(?,?,?,3)").run(hash,Date.now()-1000,Date.now()+30*86400000);}finally{db.close();}
 await page.goto("/review-access");
 await expect(page.getByText("@test_creator",{exact:true})).toBeVisible();
 await page.getByLabel("Review invitation code").fill(code);
 await page.getByRole("button",{name:"Use review invitation",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Your review trial is ready");
 await page.getByRole("link",{name:"Open your workspace",exact:true}).click();
 await expect(page.getByRole("region",{name:"Review trial",exact:true})).toContainText("25 of 25 trial DMs remaining");
 const snapshot=await(await page.request.get("/api/workspace")).json();
 expect(snapshot.access.mode).toBe("review_trial");expect(snapshot.billing).toBeNull();
 expect(snapshot.account.username).toBe("test_creator");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
