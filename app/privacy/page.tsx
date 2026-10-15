import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";

export const metadata={title:"Privacy notice | Replylane",description:"How Replylane uses Instagram account information, automation rules and message activity, and how to request deletion."};

export default function PrivacyPage(){
 return <PolicyPage title="Privacy notice">
  <p>Replylane provides Instagram sign-in, profile import and keyword-based reply automation. This notice explains the information processed by replylane.si and app.replylane.si.</p>
  <h2>Who to contact</h2>
  <p>Replylane is operated by BlockC School Private Limited, based in India. Contact <a href="mailto:hello@replylane.si">hello@replylane.si</a> about this notice, access to your information or deletion requests.</p>
  <h2>Information we process</h2>
  <ul>
   <li><strong>Connected account:</strong> Instagram account identifiers, username, display name, profile image URL, follower and post counts, and connection status. When you select a post, we request its available details from Instagram and save the selected post identifier with your automation.</li>
   <li><strong>Access credentials:</strong> OAuth access tokens and expiry information needed to use the permissions you approve. Access tokens are encrypted in the application database. Your Instagram password is entered on Instagram and is not collected by Replylane.</li>
   <li><strong>Automations and activity:</strong> rule names, keywords, reply text, links, selected post identifiers, test results, and matching comment or incoming-DM activity. Saved activity can include message text, sender and event identifiers, timestamps and delivery results. We also store usage counts and identifiers needed to honour opt-outs and prevent duplicate replies.</li>
   <li><strong>Payments and support:</strong> if payments are enabled, subscription and payment references, plan, billing dates and payment status. Payment details are entered with the payment provider. Information you send to our support address is used to handle your request.</li>
   <li><strong>Service operation:</strong> session records, temporary sign-in state, and infrastructure request and error logs used to operate and troubleshoot the service.</li>
  </ul>
  <h2>How we use it</h2>
  <p>We use this information to sign you in, display your connected account and posts, save and test your rules, process eligible Instagram events, send replies you configure, enforce sending limits and opt-outs, prevent duplicate sends, maintain security, manage subscriptions and provide support.</p>
  <p>The current keyword automation uses reply text you write. It does not send that text or incoming messages to an AI model. We do not sell Instagram message content or use it for advertising.</p>
  <h2>Providers and sharing</h2>
  <p>We exchange account and messaging data with Meta to provide the Instagram features you authorise. Vercel hosts the application and background workflows; Turso provides application storage. Razorpay processes payments when that feature is enabled. These providers process information needed for their functions. Information may be processed in countries where these providers operate.</p>
  <h2>Cookies and sign-in</h2>
  <p>Replylane uses essential cookies for your app session and to secure the Instagram/Facebook sign-in process. App sessions expire after 30 days; temporary sign-in state expires after 10 minutes. Signing out revokes your current app session. Replylane does not include advertising cookies in the current application.</p>
  <h2>Retention and deletion</h2>
  <p>Saved workspace records remain until you request their deletion. Disconnecting Instagram removes the saved account connection and access token, pauses automations and stops queued replies; it does not erase existing workspace, activity or billing records.</p>
  <p>You can request deletion of your workspace and associated information by contacting <a href="mailto:hello@replylane.si">hello@replylane.si</a>. We verify ownership before handling a deletion request. Records required for accounting, security or legal obligations, and copies in provider backups, may need to remain for their applicable retention period. See the <Link href="/data-deletion">data-deletion instructions</Link> for the steps and scope.</p>
  <h2>Your choices</h2>
  <p>You can edit or pause your automations, disconnect Instagram in Settings, revoke ReplyLane-IG access from Instagram, and contact us to request access, correction or deletion. Other people interacting with an automated DM can send STOP to opt out of further automated replies from that workspace.</p>
  <h2>Changes to this notice</h2>
  <p>We will update this notice when our data handling changes and revise the date above. Contact <a href="mailto:hello@replylane.si">hello@replylane.si</a> with questions.</p>
 </PolicyPage>;
}
