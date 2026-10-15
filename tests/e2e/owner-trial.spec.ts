import {test,expect} from "@playwright/test";
import {DatabaseSync} from "node:sqlite";
import {resolve} from "node:path";
import {signIn,seedProfile,cleanUp,testUser} from "./session";

test.beforeEach(async({context})=>{
 await signIn(context);seedProfile();
 const db=new DatabaseSync(resolve(process.env.E2E_DATABASE_PATH||".sites-runtime/replylane.db"));
 try{db.prepare("INSERT INTO owner_trials(user_id,instagram_id,starts_at,expires_at,dm_limit,used) SELECT user_id,instagram_id,?,?,25,0 FROM accounts WHERE user_id=?").run(Date.now()-1000,Date.now()+7*86400000,testUser);}finally{db.close();}
});
test.afterEach(()=>cleanUp());

test("owner trial shows its real allowance without claiming a paid plan",async({page})=>{
 await page.goto("/");
 const trial=page.getByRole("region",{name:"Owner trial"});
 await expect(trial).toContainText("25 of 25 trial DMs remaining");
 await expect(trial).toContainText("No payment required for this trial");
 await expect(page.getByText("of 25 owner trial DMs",{exact:true})).toBeVisible();
 const snapshot=await(await page.request.get("/api/workspace")).json();
 expect(snapshot.access.mode).toBe("owner_trial");expect(snapshot.billing).toBeNull();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
