import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, cleanUp, testUser } from "./session";

test.describe("Detailed activity", () => {
  test.beforeEach(async ({ context, page }) => {
    cleanUp(); await signIn(context);
    const db = new DatabaseSync(resolve(process.env.E2E_DATABASE_PATH || ".sites-runtime/replylane.db"));
    db.exec("PRAGMA busy_timeout=5000");
    try {
      const guide = randomUUID(), hours = randomUUID(), deleted = randomUUID(), now = Date.now();
      for (const [id, name, trigger, keyword, reply, media] of [[guide,"Guide giveaway","comment","GUIDE","Here is your requested guide.","99001"],[hours,"Hours reply","message","HOURS","We are open Monday to Friday.",""]]) {
        db.prepare("INSERT INTO campaigns(id,user_id,name,trigger,keywords,message,link,media_id,enabled,created_at) VALUES(?,?,?,?,?,?,?, ?,0,?)").run(id,testUser,name,trigger,JSON.stringify([keyword]),reply,"",media,now);
      }
      const add = (id: string, campaignId: string, name: string, trigger: string, status: string, time: number, simulation = 0) => db.prepare("INSERT INTO activities(id,user_id,campaign_id,campaign_name,text,status,reason,created_at,test,trigger,event_at,attempt_at,accepted_at,sender_id,sender_username,media_id,matched_keyword,reply_text,instagram_message_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id,testUser,campaignId,name,trigger==="comment"?"Please send the GUIDE!":"HOURS please",status,status==="failed"?"Instagram rejected the message (403).":status==="sent"?"Instagram accepted the message.":simulation?"Keyword matched. This is a simulation; no DM was sent.":"",time,simulation,trigger,time-3000,status==="sent"?time+100:0,status==="sent"?time+3200:0,simulation?"":"2000001",simulation?"":"demo_amanda",trigger==="comment"?"99001":"",trigger==="comment"?"GUIDE":"HOURS",trigger==="comment"?"Here is your requested guide.":"We are open Monday to Friday.",status==="sent"?"test-receipt-001":"");
      add(randomUUID(),guide,"Guide giveaway","comment","sent",now);
      add(randomUUID(),hours,"Hours reply","message","queued",now-1000);
      add(randomUUID(),hours,"Hours reply","message","failed",now-2000);
      for (let i=0;i<28;i++) add(randomUUID(),hours,"Hours reply","message","test_matched",now-3000-i*1000,1);
      add(randomUUID(),deleted,"Archived giveaway","comment","sent",now-40000);
      db.prepare("INSERT INTO activities(id,user_id,campaign_id,campaign_name,text,status,created_at,test) VALUES(?,?,?,?,?,'test_matched',?,1)").run(randomUUID(),testUser,guide,"Guide giveaway","Older test",now-40*86400000);
    } finally { db.close(); }
    await page.goto("/");
    const mobile = page.getByRole("button", { name: "Toggle Sidebar", exact: true });
    if (await mobile.isVisible()) await mobile.click();
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your activity.", exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Activity events" })).toBeVisible();
  });
  test.afterEach(() => cleanUp());

  test("filters per automation and exposes the actual event, reply and timing", async ({ page }, testInfo) => {
    await page.getByLabel("Filter by automation").selectOption({ label: "Guide giveaway" });
    await page.getByLabel("Filter by outcome").selectOption("sent");
    await expect(page.getByRole("region", { name: "Selected automation details" })).toContainText("Current keywords");
    await expect(page.getByRole("table")).not.toContainText("Hours reply");
    await page.getByRole("button", { name: /^Show details for Guide giveaway/ }).click();
    await expect(page.getByRole("heading", { name: "The comment", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reply sent to Instagram", exact: true })).toBeVisible();
    await expect(page.getByText("6.2 seconds", { exact: true })).toBeVisible();
    await expect(page.getByText("Inbox delivery and read receipts are not available here.", { exact: false })).toBeVisible();
    mkdirSync("outputs/qa", { recursive: true });
    await page.screenshot({ path: `outputs/qa/activity-${testInfo.project.name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await page.getByLabel("Filter by source").selectOption("test");
    await expect(page.getByRole("table")).toContainText("Test matched");
    await expect(page.getByRole("table")).not.toContainText("Sent to Instagram");
    await page.getByLabel("Search activity").fill("not-a-real-message");
    await expect(page.getByRole("heading", { name: "No activity matches these filters" })).toBeVisible();
  });

  test("paginates, preserves deleted automation history and refreshes without losing filters", async ({ page }) => {
    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next activity page", exact: true }).click();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    await page.getByLabel("Filter by automation").selectOption({ label: "Archived giveaway (deleted)" });
    await expect(page.getByRole("region", { name: "Selected automation details" })).toContainText("This automation was deleted");
    const refreshed = page.waitForResponse(r => r.url().includes("/api/activity?") && r.request().method() === "GET");
    await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
    expect((await refreshed).status()).toBe(200);
    await expect(page.getByRole("table")).toContainText("Archived giveaway");
    await page.getByLabel("Filter by date").selectOption("custom");
    await page.getByLabel("Activity start date").fill("2040-01-02");
    await page.getByLabel("Activity end date").fill("2040-01-01");
    await expect(page.getByRole("region", { name: "Activity filters" }).getByRole("alert")).toContainText("Choose an end date");
    await page.getByLabel("Activity end date").fill("2040-01-03");
    await expect(page.getByRole("heading", { name: "No activity matches these filters" })).toBeVisible();
  });
});

test("market research is public, sourced and usable on the landing page", async ({ page }, testInfo) => {
  await page.goto("/landing#market-research");
  const section = page.locator("#market-research");
  await expect(section.getByRole("heading", { name: "A little context. A clearer choice.", exact: true })).toBeVisible();
  await expect(section.getByRole("link", { name: "Manychat", exact: true })).toHaveAttribute("href", "https://manychat.com/pricing");
  await expect(section).toContainText("$168 billed annually");
  await expect(section).toContainText("16 October 2026");
  await expect(section.getByRole("link", { name: "Inrō", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  mkdirSync("outputs/qa", { recursive: true });
  await section.screenshot({ path: `outputs/qa/market-research-${testInfo.project.name}.png` });
});
