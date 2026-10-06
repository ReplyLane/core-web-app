# Replylane

A private, persistent first version of an Instagram DM automation SaaS for creators.

## Implemented

- Responsive workspace, reusable reply templates, drafts, search, editing, pausing and deletion.
- Comment-to-DM and incoming keyword rules, whole-keyword matching, Unicode normalization and opt-out keyword exclusion.
- Server-backed automation storage and activity logs in D1, separated by authenticated user.
- Preview and simulation console; tests never send Instagram messages or consume the allowance.
- Creator plans: USD 2.99/month or USD 24.99/year, 1 account and 1,000 DMs/calendar month (UTC).
- Guarded Instagram OAuth, encrypted tokens, signed webhooks and durable delivery records.
- Razorpay hosted subscription checkout, provider plan validation, signed billing webhooks and end-of-period cancellation.
- Competitor research with direct source links, checked 7 October 2026.

## Before live customer launch

This deployment is owner-private and uses ChatGPT sign-in. It is a working preview, not an activated Instagram integration. No credentials are included. The private audience prevents Meta and Razorpay from reaching the webhook URLs. Enable customer access deliberately after completing the following setup and provider sandbox tests.

1. Configure `APP_ORIGIN` to the hosted HTTPS origin. Set `META_APP_ID`, `META_APP_SECRET`, a supported `META_API_VERSION` from the Meta app dashboard, a random `META_WEBHOOK_VERIFY_TOKEN`, and `TOKEN_ENCRYPTION_KEY` (base64-encoded 32 random bytes). Store hosted secrets using Sites environment settings; never put them in client code or Git.
2. Register Instagram Login redirect URL `/api/instagram/callback`, request basic, comments and messaging permissions, and complete Meta App Review / Advanced Access / business verification as required. Register `/api/webhooks/instagram` and subscribe to comments and messages. Connect a professional account using Settings.
3. Obtain Razorpay international recurring-payment approval. Set provider credentials and webhook secret. Create USD plans for exactly 299 cents per month and 2499 cents per year (one billing interval each); configure their IDs. Register `/api/webhooks/razorpay`. Payment access only activates after a signed captured-payment notification.
4. Queue draining requires an authenticated scheduler POST to `/api/deliveries` every 20 seconds using `DELIVERY_WORKER_SECRET`. Configure a scheduler outside the private Sites access boundary after public launch. Each call processes one pending delivery. Events also attempt immediate delivery; sending is paced at no more than 200/hour/account. Keep `LIVE_DELIVERY_ENABLED=false` until the worker, public webhook reachability and sandbox checks are verified.
5. Reconnect Instagram when tokens expire; automatic token refresh is not implemented. Ambiguous send outcomes are marked `needs_review` and not retried. Their quota stays reserved to avoid exceeding the limit. Review stuck `processing` records manually after unexpected runtime failures; do not reset them blindly.
6. Publish your actual privacy policy, terms, support contact, refund policy and Meta data-deletion flow. Set retention limits for message text, activity and webhook deduplication records. Complete cross-user authorization and real-provider tests before acquiring paid customers.

Current limitations: no story/live/ad triggers, public comment replies, follower gates, lead capture, AI responses, customer email notifications, automatic tax calculation, top-ups, native app packaging, or lifetime checkout. Normal posts and reels and incoming text DMs are the supported trigger scope. The comparison view distinguishes annual effective pricing from month-to-month billing. A 1,000-DM paid allowance competes with LinkDM's free tier, so validate paid value with creators before launch.

## Local development

Requires Node 22.13+ and npm. Copy `.env.example` to `.env`; leave delivery disabled for local testing. `npm run dev` starts the workspace. Production API access requires the authenticated user headers supplied by the hosting dispatcher. The starter provides a localhost-only mock sign-in cookie and strips forged authentication headers from local requests. The application has no anonymous identity fallback.

Generate schema SQL with `npm run db:generate`. Build once to generate `dist/server/wrangler.json`; then apply each migration locally:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wonderful_excalibur.sql
```

Tests: `node --experimental-strip-types --test tests/rules.test.mjs`. Type checking: `npx tsc --noEmit`. Build with the Sites build helper. Generated migrations and their metadata are tracked; applied migrations are immutable.
