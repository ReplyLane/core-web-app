import { test, expect, type Page } from "@playwright/test";
import { signIn, cleanUp } from "./session";

const now = Math.floor(Date.now() / 1000);
const paidPlan = {
  status: "active", interval: "monthly", currentStart: now - 86400,
  currentEnd: now + 29 * 86400, nextChargeAt: now + 29 * 86400,
  cancelAtEnd: false, subscriptionId: "sub_testCreator", paymentId: "pay_testCreator",
  paymentStatus: "captured", updatedAt: Date.now(), hasPaidAccess: true,
  canResumeCheckout: false, canCancel: true,
};

async function openBilling(page: Page, billing: object) {
  await page.route("**/api/workspace", async route => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...await response.json(), billing } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn comments into conversations." })).toBeVisible();
  await expect(page.getByRole("button", { name: "New automation", exact: true })).toBeEnabled();
  if(test.info().title.startsWith("confirmed payment"))await page.screenshot({path:`.sites-runtime/workspace-${test.info().project.name}.png`,fullPage:true});
  const menu = page.getByRole("button", { name: "Toggle Sidebar" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Plan & billing", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Sidebar" })).toHaveCount(0);
}

test.beforeEach(async ({ context }) => { await signIn(context); });
test.afterAll(() => cleanUp());

test("confirmed payment references and cancellation are visible without starting another subscription", async ({ page }) => {
  await openBilling(page, paidPlan);
  const summary = page.getByRole("region", { name: "Your subscription" });
  await expect(summary).toContainText("sub_testCreator");
  await expect(summary).toContainText("pay_testCreator");
  await expect(summary).toContainText("Payment confirmed");
  await expect(page.getByRole("button", { name: "Your plan is active" })).toHaveCount(2);
  await page.screenshot({ path: `.sites-runtime/billing-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Stop future billing", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Any confirmed paid access stays available");
  await page.getByRole("button", { name: "Keep subscription" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("activation without capture stays payment pending and never claims expired paid access", async ({ page }) => {
  await openBilling(page, { ...paidPlan, currentStart: 0, currentEnd: 0, nextChargeAt: 0, paymentId: null, paymentStatus: "awaiting_payment", hasPaidAccess: false });
  const summary = page.getByRole("region", { name: "Your subscription" });
  await expect(summary).toContainText("Payment pending");
  await expect(summary).not.toContainText("Paid access ended");
  await expect(summary).not.toContainText("Next payment");
  await expect(summary).toContainText("This status refreshes automatically");
  const buttons = page.getByRole("button", { name: "Awaiting payment", exact: true });
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
});

test("uncertain checkout explains recovery and prevents a second mandate", async ({ page }) => {
  await openBilling(page, { ...paidPlan, status: "checkout_uncertain", subscriptionId: null, paymentId: null, currentStart: 0, currentEnd: 0, nextChargeAt: 0, paymentStatus: "awaiting_payment", hasPaidAccess: false, canCancel: false });
  const summary = page.getByRole("region", { name: "Your subscription" });
  await expect(summary).toContainText("Checkout needs review");
  await expect(summary).toContainText("avoid duplicate billing");
  await expect(summary.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "mailto:reply.lane.app@gmail.com");
  const buttons = page.getByRole("button", { name: "Manage current subscription", exact: true });
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
});

test("refunded access does not imply paid access while a future mandate remains cancellable", async ({ page }) => {
  await openBilling(page, { ...paidPlan, status: "refunded", paymentStatus: "refunded", hasPaidAccess: false, cancelAtEnd: false });
  const summary = page.getByRole("region", { name: "Your subscription" });
  await expect(summary).toContainText("Payment refunded");
  await expect(summary).toContainText("There is no current confirmed paid access");
  await expect(summary.getByRole("button", { name: "Stop future billing" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
