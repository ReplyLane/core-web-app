# Instagram App Review preparation

Operator: BlockC School Private Limited, India. Contact: hello@replylane.si.

Status checked 16 October 2026 (India): the Meta app is published and company business verification is **Verified**. The developer account confirmation block has cleared. Tech Provider access verification has been submitted and is **In review**; this is separate from permission App Review, whose submission remains a draft. Do not resubmit company verification or claim Tech Provider access has been approved.

## Requested permissions

Request only `instagram_business_basic`, `instagram_business_manage_messages` and `instagram_business_manage_comments` for the direct Instagram Login integration. The review draft also includes Meta's default `public_profile` entry. The legacy `instagram_manage_comments` request was removed from the draft; it is not the direct Instagram Login scope used by this app.

The app icon, Business and pages category, privacy URL and deletion-instructions URL are saved in Meta. The Website platform has Site URL https://app.replylane.si/. Public disclosures identify the company and use the brand email. No company PAN, TAN, certificate or private credentials belong in public pages or review recordings.

## Reviewer access

Reviewers must sign in through the real Instagram OAuth flow using an eligible Business or Creator account. An invitation provides the same application features and delivery pipeline as a customer, without requiring a payment. It grants at most 25 replies for seven days to the connected Instagram account; it never turns on an automation. It cannot replace Meta permissions, bypass account verification or reset the owner trial.

After deploying migration 0005 and the review-access route, create an invitation with the intended production database environment:

```
node scripts/create-review-invite.mjs /private/tmp/replylane-review-invitation.json
```

The script creates a new mode-0600 file and stores only a SHA-256 hash in the database. It does not print the code. Each invitation accepts at most three account claims during its 395-day lifetime: one year plus a 30-day preparation margin, because Meta asks that access codes remain valid for one year after submission. Recheck the remaining validity on the actual submission date. Each account/workspace can receive only one review trial; a reconnect, a different code or a monthly usage reset cannot renew it. Existing customer billing remains required unless the workspace has a valid explicitly granted trial.

The route and migration are deployed to production. A replacement private invitation was prepared on 16 October 2026 at `/private/tmp/replylane-review-invitation-2026-10-16.json`, valid until 14 November 2027. The unused original 30-day invitation was revoked without affecting any trial. The replacement code is saved only in Meta's private reviewer access-code field. Keep its local file private and check that at least one year remains on the actual submission date.

Supply the code only in Meta's private reviewer instructions. Do not put it in a public URL, issue, repository, screenshot or video. Reviewers enter it at https://app.replylane.si/review-access after signing in. Do not give reviewers the operator's Instagram password or a session cookie.

Revoke the invitation and any active grants after the review:

```
node scripts/revoke-review-invite.mjs /private/tmp/replylane-review-invitation.json
```

## Draft reviewer instructions

These steps and the private invitation are saved in Meta's reviewer-instructions draft. The deployed website uses direct Instagram Login; Facebook Login is not enabled in production. The owner has confirmed that both real comment and incoming-DM automatic replies arrived. These instructions do not certify that missing recordings or Meta's permission prechecks have been completed.

1. Open https://app.replylane.si/ and choose **Continue with Instagram**. Sign in with an Instagram Business or Creator account and approve the requested profile, comment and messaging access. Replylane does not ask for or receive your Instagram password.
2. After returning, verify that the connected username, profile and account details match your Instagram account. Open https://app.replylane.si/review-access and enter the invitation supplied privately with the submission. Open your workspace; the review-trial panel shows the remaining allowance and expiry. No payment details are required.
3. Choose **New automation**. Name it **Review comment reply**. Keep **Comments on a post or reel**, choose **Load my posts**, and select a post you control that another test account can comment on. Set keyword **REVIEWGUIDE**, reply **Thanks for commenting! This is the guide reply you requested.**, and save. Saving leaves it paused.
4. Optionally use **Test an automation** with **REVIEWGUIDE**. The result is explicitly a simulation and does not send a message. Then enable the saved rule for a real test.
5. From a second Instagram account, comment **REVIEWGUIDE** on the selected post. The commenter receives one private automatic reply. In Replylane, open **Activity** and refresh to see the Instagram event and delivery result. A **sent** result means Instagram accepted the message; check the recipient's actual Instagram inbox or message requests for delivery.
6. Create a separate rule named **Review incoming DM**, select **Sends a keyword in a DM**, set keyword **REVIEWHELLO**, write a reply, save and enable. Send **REVIEWHELLO** to the connected professional account from the second account's Instagram inbox. Verify the automatic reply there and its result in Replylane's Activity.
7. To test opting out, send **STOP** from that second account. Subsequent matching messages from the same sender do not receive automated replies. Use this check last so the opt-out does not prevent earlier test replies.
8. Open **Settings** to find privacy, deletion and support links. Choose **Disconnect** and confirm: the saved Instagram token is removed, automations pause and pending replies stop. Full workspace deletion is a separate verified support request described at https://replylane.si/data-deletion.

## Draft comment permission explanation

Replylane helps the owner of an Instagram professional account send a reply that a commenter requested. After Instagram Login, the owner creates an automation, loads their own posts or reels, chooses the post and keyword, and writes the private reply. Rules are saved as drafts and send only after the owner enables them and has sending access.

`instagram_business_manage_comments` is needed to receive the connected account's comment webhook events and identify the comment, its text and its post for the owner's keyword rule. Replylane checks the webhook signature, account ownership, post selection, keyword match, duplicate events and opt-outs before queuing a reply. It sends the private reply through Instagram's Private Replies API using the comment identifier. Incoming DM automation separately uses `instagram_business_manage_messages`. The app does not post public comments, scrape unrelated profiles or send cold outreach. It uses the owner's written text, not an AI-generated response.

To reproduce: create and enable a comment rule on a post you control; comment its keyword from a second account; check the one private reply in Instagram and the real event in Activity. The in-app simulation is distinct from a real delivery and must not be used as evidence that the API test passed.

## Evidence and remaining requirements

- Developer confirmation is complete and company verification is approved. Tech Provider access is in review.
- Both real incoming-DM and comment-to-DM replies were accepted by Instagram and confirmed received by the owner. Production Activity records the real deliveries separately from simulations. The approved brand test post is https://www.instagram.com/p/DehhJOCE1_s/. The active **Meta comment review test** rule matches **REPLYLANETEST** and is now restricted to that post, media ID `18117295805282423`.
- A real GET request for the test comment's `id,media,text,timestamp` returned HTTP 200 on 16 October 2026 (India), with the correct media and keyword. Meta's permission API precheck still needs a fresh native-dashboard check; its count can update later. Do not replace this requirement with a simulated event.
- Accurate processor countries, including applicable provider access outside the selected database/function region. Vercel and Turso process the deployed app's data; the actual locations must be confirmed from provider records. Do not treat Mumbai deployment alone as proof of India-only processing.
- The operator confirmed no national-security disclosures in the preceding 12 months and adopted `DATA-REQUESTS.md` with the restricted local records folder. The draft questionnaire now contains that No answer and all four adopted processes. These are the operator's factual confirmations, not an independent audit or a claim about practices before adoption.
- The three Instagram permission explanations and their allowed-use agreements are saved. The automatically granted `public_profile` entry has its allowed-use agreement saved; the reviewer instructions accurately state that the deployed Instagram integration does not use Facebook Login.
- An authorized end-to-end screencast showing the real OAuth consent, profile import, selected post, configured rules and actual Instagram delivery. Scoped recording is approved, but the operator has deferred the separate recipient-account login and inbox recording to a later stage. The finished video must be offered for the operator's review before upload. Do not include credentials, invitation codes, unrelated inbox content or simulated delivery presented as real.
- Before submission, verify that the demonstration post still has valid sending access. The current owner trial expires on 22 October 2026 and has a hard 25-reply limit. Do not silently extend it or reset usage; the reviewer invitation grants access to reviewers' own connected accounts separately.
- Complete the provider answers, upload the approved complete recordings, recheck the permission API precheck, and submit only when Meta enables submission.

## Provider evidence to finish

The deployed application uses Vercel for hosting and workflow delivery, and Turso for relational database storage. Its Vercel function region is `bom1` (Mumbai), and the production database was provisioned in Mumbai. These region settings do not establish every country from which provider staff can access data or where backups, service metadata or applicable subprocessors process it.

- Vercel: [Security and compliance](https://vercel.com/docs/security/compliance) states that processing can occur in the United States and other provider locations. [Its DPA](https://vercel.com/legal/dpa) refers to the current list at the [Trust Center](https://security.vercel.com/). Obtain the countries applicable to this account's hosting, workflow payloads, logs, backups and support access; do not copy unrelated v0/AI subprocessors into Replylane's inventory.
- Turso: [Terms of Use](https://turso.tech/terms-of-use) directs subscribers to the account's Documents section for its DPA. Check that document and the [Trust Center](https://trust.turso.tech/) for the production database, backup and authorized support-access locations. A database region alone does not confirm staff-access countries.

If the account records do not provide the full list, prepare a provider inquiry asking: "For our Mumbai-hosted application/database, in which countries can customer platform data be stored, processed or accessed, including backups, workflow payloads, logs and support access? Please provide the applicable DPA and subprocessor list for our current plan." Send only after the operator authorizes vendor contact. No vendor message has been sent.
