# Instagram App Review preparation

Operator: BlockC School Private Limited, India. Contact: hello@replylane.si.

Status checked 15 October 2026: the Meta app is published; business verification is **In review**. The App Review submission is a draft. Tech Provider access verification is disabled until business verification finishes. Meta subsequently required developer account confirmation. Resolve that prompt before further dashboard edits; do not resubmit the company verification.

## Requested permissions

Request only `instagram_business_basic`, `instagram_business_manage_messages` and `instagram_business_manage_comments` for the direct Instagram Login integration. The review draft also includes Meta's default `public_profile` entry. The legacy `instagram_manage_comments` request was removed from the draft; it is not the direct Instagram Login scope used by this app.

The app icon, Business and pages category, privacy URL and deletion-instructions URL are saved in Meta. Public disclosures identify the company and use the brand email. No company PAN, TAN, certificate or private credentials belong in public pages or review recordings.

## Reviewer access

Reviewers must sign in through the real Instagram OAuth flow using an eligible Business or Creator account. An invitation provides the same application features and delivery pipeline as a customer, without requiring a payment. It grants at most 25 replies for seven days to the connected Instagram account; it never turns on an automation. It cannot replace Meta permissions, bypass account verification or reset the owner trial.

After deploying migration 0005 and the review-access route, create an invitation with the intended production database environment:

```
node scripts/create-review-invite.mjs /private/tmp/replylane-review-invitation.json
```

The script creates a new mode-0600 file and stores only a SHA-256 hash in the database. It does not print the code. Each invitation accepts at most three account claims during its 30-day lifetime. Each account/workspace can receive only one review trial; a reconnect, a different code or a monthly usage reset cannot renew it. Existing customer billing remains required unless the workspace has a valid explicitly granted trial.

The route and migration are deployed to production. A private invitation was prepared on 15 October 2026 at `/private/tmp/replylane-review-invitation-2026-10-15.json`, valid until 14 November 2026. Its code has not been submitted to Meta. Keep this file private and check its expiry before completing the submission.

Supply the code only in Meta's private reviewer instructions. Do not put it in a public URL, issue, repository, screenshot or video. Reviewers enter it at https://app.replylane.si/review-access after signing in. Do not give reviewers the operator's Instagram password or a session cookie.

Revoke the invitation and any active grants after the review:

```
node scripts/revoke-review-invite.mjs /private/tmp/replylane-review-invitation.json
```

## Draft reviewer instructions

Save these steps in Meta only after adding the private invitation and confirming that the real comment flow works. These instructions do not certify that missing tests or recordings have been completed.

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

`instagram_business_manage_comments` is needed to receive the connected account's comment webhook events and identify the comment, its text and its post for the owner's keyword rule. Replylane checks the webhook signature, account ownership, post selection, keyword match, duplicate events and opt-outs before queuing a reply. The private message is sent with the messaging permission and the comment identifier through Instagram's official API. The app does not post public comments, scrape unrelated profiles or send cold outreach. It uses the owner's written text, not an AI-generated response.

To reproduce: create and enable a comment rule on a post you control; comment its keyword from a second account; check the one private reply in Instagram and the real event in Activity. The in-app simulation is distinct from a real delivery and must not be used as evidence that the API test passed.

## Evidence still needed

- Developer account confirmation, followed by a fresh status check in Meta.
- Company verification approval, then Tech Provider access verification.
- Accurate processor countries, including applicable provider access outside the selected database/function region. Vercel and Turso process the deployed app's data; the actual locations must be confirmed from provider records. Do not treat Mumbai deployment alone as proof of India-only processing.
- The operator's factual answer about national-security disclosures during the previous 12 months, and confirmation of the practices actually in place. `DATA-REQUESTS.md` remains a draft pending adoption; writing it does not establish past practices.
- Real comment-to-DM delivery and Meta's required API precheck. The approved brand test post is https://www.instagram.com/reply.lane/p/DehhJOCE1_s/. The separate **Meta comment review test** rule was created paused and is now enabled for keyword **REPLYLANETEST**, with no post filter. The owner has one published post. A matching comment and DM from the test sender are visible in Instagram, but production request logs show no Instagram webhook POSTs during the checked hour. Loading posts returned Meta's **API access blocked** error after the developer confirmation prompt. Both the DM and comment rules are enabled; do not claim the new end-to-end test passed. Recheck delivery and select the specific post once API access is restored.
- An authorized end-to-end screencast showing the real OAuth consent, profile import, selected post, configured rules and actual Instagram delivery. Do not include credentials, invitation codes, unrelated inbox content or simulated delivery presented as real.
- Save the remaining allowed-use descriptions, complete the data-handling answers, inspect all required checkboxes, and submit only when Meta enables submission.
