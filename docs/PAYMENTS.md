# ReplyLane.si payments and subscriptions

ReplyLane.si uses Razorpay-hosted subscription checkout. Payment details stay with Razorpay. The server creates subscriptions, validates the configured plans and grants access only after a signed `subscription.charged` event and a fresh payment verification. Credentials, merchant approval and a public webhook endpoint are still required to collect real money.

## Indian merchant onboarding

Create the merchant account in the correct legal entity name, declare ReplyLane.si as the brand where requested and complete Razorpay's activation flow. Eligible applicants can use existing CKYC records with PAN and OTP consent to reduce repeated document uploads. Follow the offered DigiLocker, document or Video KYC fallback if retrieval fails. Requirements depend on the business type; this is not a no-KYC integration. Add and verify your Indian settlement bank account through Razorpay. Supply proof if requested and wait for activation before accepting live payments. [Official onboarding guide](https://razorpay.com/docs/payments/set-up/).

The settlement account is configured with Razorpay, rather than connected to this application's database. Razorpay settles eligible collections according to the merchant's settlement cycle. [Settlements documentation](https://razorpay.com/docs/payments/settlements/).

## Currency and recurring methods

Existing pricing remains **USD 2.99 monthly** and **USD 24.99 yearly**. Create matching Razorpay plans with amounts **299** and **2499** in USD subunits, frequency `monthly` / `yearly` and interval `1`. Place their IDs in the corresponding environment variables. Checkout fails safely when the provider plan differs from the displayed price. [Create and view plans](https://razorpay.com/docs/payments/subscriptions/create-plans/).

Confirm international payment and recurring eligibility for your merchant account before using these USD plans. Razorpay supports multiple subscription payment methods, including cards, UPI AutoPay and eMandate, but availability depends on the account, plan, bank and method. Do not advertise UPI or Indian bank mandates for these USD plans without confirmation from Razorpay. An INR launch needs explicit INR product prices and coordinated display, checkout and webhook validation changes; replacing the plan IDs alone intentionally fails validation. [Supported methods](https://razorpay.com/docs/payments/subscriptions/supported-payment-methods/), [international payments](https://razorpay.com/docs/payments/international-payments/).

## Configure the integration

1. Use test mode first. Create both plans in that mode and configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_MONTHLY_PLAN_ID` and `RAZORPAY_YEARLY_PLAN_ID` as server secrets. Keep test and live configurations separate.
2. Apply the application's Drizzle migrations, including `0003_subscription_tracking.sql`, before running this code against an existing database. The new migration preserves existing subscriptions and adds billing dates and payment tracking fields.
3. Set `APP_ORIGIN` to the actual application origin. Checkout and cancellation require a signed-in workspace and the same origin.
4. In Razorpay **Accounts & Settings → Webhooks**, register `https://YOUR_DOMAIN/api/webhooks/razorpay` and configure a distinct secret matching `RAZORPAY_WEBHOOK_SECRET`. Enable `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.updated`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.paused`, `subscription.resumed` and `payment.refunded`. [Subscription webhook setup](https://razorpay.com/docs/payments/subscriptions/subscribe-to-webhooks/).
5. Verify captured payments, failed renewals, cancellation and full/partial refunds in test mode. Confirm webhook deliveries succeed. After merchant activation, switch keys, plan IDs and webhook configuration together to live mode. [Test and live modes](https://razorpay.com/docs/payments/dashboard/test-live-modes/).

## Track subscriptions in the gateway

Yes: use the Razorpay Dashboard as the merchant billing console. Open **Payment Products → Subscriptions**, select the `sub_…` reference shown in the customer's ReplyLane.si billing panel and inspect its status and billing information. Each application-created subscription includes `replylane_user_id` and `replylane_interval` in its notes to help map it to a workspace. Review invoices and individual `pay_…` transactions in the gateway for the full payment history. [View subscription details](https://razorpay.com/docs/payments/subscriptions/view), [subscription invoices API](https://razorpay.com/docs/api/payments/subscriptions/fetch-invoices/).

Use Razorpay's payments, settlements and reports views to reconcile successful collections with money received in the bank. Subscription status, captured payment status and settlement status describe different steps. The customer workspace shows the latest known plan payment, rather than a complete accounting ledger. [Dashboard reports](https://razorpay.com/docs/payments/dashboard/reports/).

## Customer tracking and cancellation

`GET /api/workspace` returns only the signed-in customer's billing snapshot: provider subscription reference, plan interval and state, verified paid-period dates, next scheduled charge, cancellation state, latest confirmed plan-payment reference/status, last update time and server-calculated access. Billing timestamps are Unix seconds; `updatedAt` is milliseconds. Refresh reads the latest stored webhook result; it does not poll the gateway on every page load.

Unpaid created checkouts can be resumed through the same checkout endpoint without creating another mandate. Cancellation stops future billing: active paid subscriptions cancel at the cycle end when available; unpaid, authenticated, failed, paused or refunded mandates request immediate cancellation. Previously verified paid access remains available through its paid period. The gateway remains authoritative if an operation is rejected. [Cancellation API](https://razorpay.com/docs/api/payments/subscriptions/cancel-subscription/).

Signed webhooks are deduplicated and tolerate out-of-order lifecycle/charge/refund delivery. Authorisation or activation alone does not grant paid access. A charge grants only the billing period in its signed event, after checking the current provider payment amount, currency and refund state. A full refund of the latest tracked plan payment revokes access; a partial refund preserves the paid period. Refunding a payment does not itself cancel the recurring mandate: cancel renewal separately when appropriate. [Webhook validation and ordering](https://razorpay.com/docs/webhooks/validate-test/), [payment verification API](https://razorpay.com/docs/api/payments/fetch-with-id/).

If checkout reports `creating` or `checkout_uncertain`, reconcile its notes and subscriptions in Razorpay before allowing another attempt. A timeout or provider server error can happen after creation; automatic retries could cause duplicate billing. If a charge succeeds but the workspace remains unpaid, inspect webhook delivery and replay the relevant signed provider event after resolving the failure. There is no automatic scheduled reconciliation job in this codebase.

Run `npm test` for the backend billing/security checks. Live merchant onboarding and real bank settlement have not been exercised by the automated tests.
