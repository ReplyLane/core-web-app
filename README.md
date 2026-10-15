# ReplyLane.si

**Good conversations go places.** A considered Instagram reply workspace for creators, with a warm, minimal interface and components made for the task.

Super Intelligence is the brand philosophy: helping people work with clarity, care, and control. The current app uses messages written by the creator and explicit keyword rules, with previews, simulation, and delivery controls.

## Deploy on Vercel

This checkout uses standard Next.js App Router on Node.js 24, with Turso/libSQL for persistent SQLite storage. `vercel.json` selects the Next.js framework and standard npm build. The root domain serves the landing page; the app subdomain serves social sign-in and the workspace.

1. Import `ReplyLane/core-web-app` into Vercel or use the existing `core-web-app` project.
2. Connect a Turso database and set `TURSO_DATABASE_URL` and secret `TURSO_AUTH_TOKEN`. Never use a local file database on Vercel.
3. Configure the server environment values listed in `.env.example`, with `AUTH_MODE=meta`, `APP_ORIGIN=https://app.replylane.si`, and `LIVE_DELIVERY_ENABLED=false` initially. Keep all provider secrets and the encryption key server-only.
4. Apply migrations to the selected database with `npm run db:migrate` from a trusted local environment. The migration runner records applied migrations; do not apply the same SQL manually afterward. Database provisioning does not copy data from a previous D1 database.
5. Deploy the tested source and attach `replylane.si` and `app.replylane.si`. Use the exact DNS targets shown by Vercel for this project, preserving email records.
6. Verify public HTTPS, Instagram OAuth, and signed webhooks before enabling delivery. Configure any Vercel Deployment Protection so Meta can reach the production callback and webhook.

## Social sign-in and Instagram onboarding

The landing page belongs at `https://replylane.si`; the signed-in app belongs at `https://app.replylane.si`. Use `https://app.replylane.si` for the production `APP_ORIGIN`. The Meta app contact is `hello@replylane.si`. The Meta development app is **ReplyLane** (`1113566377838569`), and its Instagram Login app ID is `29028825036747355`. These are different identifiers: use the Instagram Login ID for `META_APP_ID`. App secrets belong only in ignored local environment files or the hosting secret manager.

Meta Social Technologies MCP is an administration connection for checking app setup and configuring webhooks. It does not replace customer OAuth or the Graph API calls used by ReplyLane.si. Its official endpoint is `https://mcp.facebook.com/devtools`. For the current account, app creation is still performed in the Meta dashboard; the connected MCP exposes documentation, app inspection, review/compliance, API health, and webhook tools.

The local application now uses Instagram or Facebook sign-in by default (`AUTH_MODE=meta`). Successful login creates a server-side ReplyLane.si session, imports the authorized Instagram profile, subscribes the account to comments/messages, and opens the automation workspace. Facebook login shows a choice of professional accounts linked to the Pages the person approved. Recent posts can be loaded inside the automation editor.

Meta credentials are not included. To activate real sign-in:

1. Choose a publicly reachable HTTPS origin, including for staging, and set `APP_ORIGIN` to that exact origin without a trailing slash. Keep `LIVE_DELIVERY_ENABLED=false` until real-provider testing is complete. Localhost can render the UI; Meta must accept the registered redirect URI, and webhook delivery needs a public endpoint.
2. In the Meta developer dashboard, configure Instagram API with Instagram Login. Put its Instagram App ID and secret in `META_APP_ID` and `META_APP_SECRET`. Select a supported Graph API version in `META_API_VERSION`; do not assume a version from a code example is current. Grant `instagram_business_basic`, `instagram_business_manage_comments`, and `instagram_business_manage_messages` as applicable to the app's reviewed use case.
3. Register the exact Instagram redirect URI: `https://app.replylane.si/api/instagram/callback`.
4. For Facebook, configure Facebook Login for Business. Set its `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `FACEBOOK_LOGIN_CONFIG_ID`. These may differ from the Instagram credentials. Use a user-access-token configuration with the Page and Instagram permissions needed to list Pages, read the linked professional account, subscribe webhooks, manage comments, and send messages: `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `instagram_basic`, `instagram_manage_comments`, and `instagram_manage_messages`. Confirm requirements and available permissions in the current Meta dashboard. Register `https://app.replylane.si/api/facebook/callback`.
5. Generate `TOKEN_ENCRYPTION_KEY` as 32 random bytes encoded as base64. Generate a separate random `META_WEBHOOK_VERIFY_TOKEN`. Store secret values only in the ignored local `.env` or the deployment's secret manager. Preserve the encryption key securely; changing it makes existing account tokens unreadable.
6. In **API setup with Instagram login → Configure webhooks**, save callback `https://app.replylane.si/api/webhooks/instagram`, the verify token, and comments/messages subscriptions. Configuring only the parent app's generic Webhooks product does not populate this Instagram Login setting. Publish the Meta app so it can deliver events. This integration signs events with the **Instagram app secret** shown in the same Instagram Login setup: use `META_APP_SECRET`, or set `META_WEBHOOK_APP_SECRET` to that same secret. A parent app's Basic settings secret is a different credential and rejects these events with HTTP 401. Override the signing secret only when a different app actually owns the incoming webhook; Facebook-connected accounts use `FACEBOOK_APP_SECRET`. Signed webhooks can be acknowledged while `LIVE_DELIVERY_ENABLED=false`, but delivery and quota consumption remain disabled. Complete the dashboard's App Review, access-level, and verification requirements before connecting outside customers. Facebook users need a professional Instagram account linked to an approved Facebook Page.
7. Public disclosures are available at `https://replylane.si/privacy` and `https://replylane.si/data-deletion`; register these as the privacy-policy URL and data-deletion instructions URL in Meta's Basic settings. Publishing the app does not itself grant Advanced Access for other businesses. Meta may require Tech Provider status, business verification, access verification and App Review before customer onboarding.
8. Apply `drizzle/0002_shiny_thor_girl.sql` once after migrations 0000 and 0001, then apply `drizzle/0003_subscription_tracking.sql` for renewal and payment tracking and `drizzle/0004_watery_roland_deschain.sql` for the limited owner trial. Existing users and automation records remain intact. Do not re-run SQL files already applied.
9. Restart the server after changing `.env`. Use the sign-in page, approve access, select an account when using Facebook, and confirm the profile appears. Create an automation, load a recent post or use all posts, set keywords and a reply, save, then use the simulation console. Activation requires configured live delivery and a paid plan or an eligible owner trial; login does not silently enable sending or billing.

Sessions use random, hashed database tokens and HttpOnly, SameSite=Lax cookies (Secure on HTTPS), expire after 30 days, rotate on sign-in, and are revoked on sign-out. OAuth state and temporary account choices expire after 10 minutes and are bound to the starting browser. Provider access tokens and pending Page tokens are encrypted and never returned to the client. Accounts are not merged by username or email. To add a second login method, sign in through the original method and use Settings to connect it to the same Instagram account; conflicting ownership is rejected. Different provider-scoped Instagram identifiers cannot be assumed to represent the same account.

`AUTH_MODE=hosting` is an explicit compatibility option for deployments where a trusted dispatcher supplies verified identity headers. Never enable it on an unprotected origin that accepts client-supplied identity headers. Keep `AUTH_MODE=meta` on Vercel: this mode ignores hosting identity headers. Provider callbacks and webhooks must be publicly reachable.

Reference: [Meta's Page-token and linked Instagram account flow](https://www.postman.com/meta/instagram/request/lpx8lul/get-access-tokens-of-pages-you-manage).

## Implemented

- Responsive workspace, reusable reply templates, drafts, search, editing, pausing and deletion.
- Comment-to-DM and incoming keyword rules, whole-keyword matching, Unicode normalization and persistent recipient opt-outs.
- Server-backed automation storage and activity logs in Turso/libSQL, separated by authenticated user.
- Preview and simulation console; tests never send Instagram messages or consume the allowance.
- Creator plans: USD 2.99/month or USD 24.99/year, 1 account and 1,000 DMs/calendar month (UTC).
- Guarded Instagram OAuth, encrypted tokens, signed webhooks, account disconnection, and durable delivery records.
- Razorpay hosted subscription checkout, provider plan validation, signed billing webhooks and end-of-period cancellation.
- Competitor research with direct source links, checked 7 October 2026.

## Indian merchant payments and subscription tracking

Razorpay hosted subscription checkout is integrated. Activate your merchant account, complete Razorpay’s required KYC, and verify the Indian bank account used for settlements. Eligible merchants can use its digital KYC path; Razorpay determines the verification steps and approval. The app keeps merchant identity documents and bank credentials outside its own checkout flow.

Existing plans charge USD 2.99/month or USD 24.99/year. International recurring-payment eligibility requires Razorpay approval; INR plans need a deliberate pricing and provider-plan change. Use separate test and live credentials and complete test-mode checkout before enabling live payments.

Track customers in **Razorpay Dashboard → Subscriptions** using the `sub_` subscription ID and `notes.replylane_user_id`; payment records use `pay_` IDs. The app’s billing view shows signed-webhook-backed subscription status, paid-through date, next charge, last payment reference/status, and renewal cancellation. A checkout return alone does not activate a paid plan.

See [payment setup, KYC, settlement, and subscription tracking](docs/PAYMENTS.md) for the merchant checklist, provider references, webhook setup, and operating details.

## Before live customer launch

This remains a working preview until Meta and billing credentials and public provider endpoints are configured. Deployment Protection can prevent external provider calls. Configure hosting access deliberately after completing the following setup and provider sandbox tests.

1. Configure `APP_ORIGIN` to the hosted HTTPS origin. Set `META_APP_ID`, `META_APP_SECRET`, a supported `META_API_VERSION` from the Meta app dashboard, a random `META_WEBHOOK_VERIFY_TOKEN`, and `TOKEN_ENCRYPTION_KEY` (base64-encoded 32 random bytes). Store hosted secrets using Vercel environment settings; never put them in client code or Git.
2. Register Instagram Login redirect URL `/api/instagram/callback`, request basic, comments and messaging permissions, and complete Meta App Review / Advanced Access / business verification as required. Register `/api/webhooks/instagram` and subscribe to comments and messages. Connect a professional account using Settings.
3. Obtain Razorpay international recurring-payment approval. Set provider credentials and webhook secret. Create USD plans for exactly 299 cents per month and 2499 cents per year (one billing interval each); configure their IDs. Register `/api/webhooks/razorpay`. Payment access only activates after a signed captured-payment notification.
4. Set `DELIVERY_WORKFLOW_ENABLED=true` on Vercel to drain queued replies with durable Workflow steps and 20-second sleeps. Webhooks attempt immediate delivery and start a background drain for paced replies; no browser tab or external cron is required. `POST /api/deliveries` remains available to a signed-in workspace or an operator using `DELIVERY_WORKER_SECRET` to recover a queue and check Workflow connectivity. Ambiguous sends are never replayed. Keep `LIVE_DELIVERY_ENABLED=false` until webhook and queue connectivity are verified.
5. Reconnect Instagram when tokens expire; automatic token refresh is not implemented. Ambiguous send outcomes are marked `needs_review` and not retried. Their quota stays reserved to avoid exceeding the limit. The worker marks stale `processing` records for review after two minutes; do not reset them blindly.
6. Publish your actual privacy policy, terms, support contact, refund policy and Meta data-deletion flow. Set retention limits for message text, activity and webhook deduplication records. The automated suite covers cross-user authorization; complete real-provider sandbox tests before acquiring paid customers.

Current limitations: no story/live/ad triggers, public comment replies, follower gates, lead capture, generated responses, customer email notifications, automatic tax calculation, top-ups, native app packaging, or lifetime checkout. Normal posts and reels and incoming text DMs are the supported trigger scope. The comparison view distinguishes annual effective pricing from month-to-month billing. A 1,000-DM paid allowance competes with LinkDM's free tier, so validate paid value with creators before launch.

## Local development

Requires Node.js 24 and npm. Copy `.env.example` to `.env`, set `TURSO_DATABASE_URL=file:.sites-runtime/replylane.db` for local development (or use a separate remote development database), set `APP_ORIGIN=http://127.0.0.1:5173`, and keep delivery disabled. Create the `.sites-runtime` directory, run `npm run db:migrate`, then `npm run dev`.

`npm run build` runs the standard Next.js production build, and `npm start` serves it. Generate schema changes with `npm run db:generate`, inspect the new SQL, then apply with `npm run db:migrate`. Keep applied migrations immutable. The API requires a valid app session; it has no anonymous identity fallback.

## Repeatable verification

- `npm test`: rule checks plus backend integration tests against real, isolated in-memory SQLite databases. Tests execute the actual API route implementations; Meta and Razorpay network calls use deterministic test doubles, never real accounts or money.
- `npm run typecheck`: TypeScript validation.
- `npm run test:e2e`: Playwright tests on desktop and mobile Chromium. Apply local migrations first. The suite starts the local server when needed and seeds short-lived hashed sessions directly in local test storage; it exposes no test-login API. It checks social sign-in availability, expired account selection, imported profile display, post selection, creation, editing, persistence after reload, keyword tests, activity, filters, deletion confirmation, validation, error recovery, setup screens, mobile navigation, layout overflow, and rejection of forged sign-in headers. Test records are cleaned up afterward. macOS uses an installed Chrome browser; on other systems run `npx playwright install chromium` first.
- Browser traces and JSON results are saved under ignored `.sites-runtime/`. These are local testing artifacts and are not included in the deployed app.

Local browser tests support configured or unconfigured social sign-in without contacting the OAuth providers. Payment setup checks expect unconfigured Razorpay credentials. Use an isolated development environment with `LIVE_DELIVERY_ENABLED=false`. Tests create rules with unique E2E names and remove them after the normal lifecycle; a failed test may leave a draft for inspection.

Provider integration cases include OAuth state ownership/expiry/replay, encrypted token storage, subscription price checks, simultaneous checkout prevention, ambiguous-checkout blocking, captured-payment activation, authorization-only rejection, duplicate/signed/tampered webhooks, full versus partial refunds, cancellation, comment and incoming-message recipients, opt-out persistence, pacing across accounts, expiry, quota limits, server/network failure handling and disconnection. The payment state logic follows [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/) and [subscription event documentation](https://razorpay.com/docs/webhooks/subscriptions/).

These automated provider cases are mocks. Live Meta account connection and Razorpay test-mode checkout still require approved credentials and publicly reachable signed webhook endpoints; those are separate launch acceptance checks.


## Publish to GitHub

The project repository is `https://github.com/ReplyLane/core-web-app.git`. From the app repository, after committing the changes you want to publish, update an existing `origin` and push:

```sh
git remote set-url origin https://github.com/ReplyLane/core-web-app.git
git push -u origin main
```

If the repository has no `origin`, use this command before pushing:

```sh
git remote add origin https://github.com/ReplyLane/core-web-app.git
```

## Owner trial

The operator-only `scripts/grant-owner-trial.mjs <verified-instagram-id>` grants @reply.lane a single seven-day, 25-DM trial. Run it with the intended database environment only after verifying that account ID. There is no public grant endpoint. The server binds the allowance to both the workspace and Instagram account ID; reconnects, monthly quota resets and repeat provisioning do not renew it. Definitive provider rejections release reservations; uncertain outcomes retain them. Paid subscriptions keep their existing checks and limits. The workspace displays the trial expiry and remaining allowance.
