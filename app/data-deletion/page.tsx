import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";

export const metadata={title:"Data deletion | Replylane",description:"Disconnect Instagram, revoke Replylane permissions or request deletion of your workspace data."};

export default function DataDeletionPage(){
 return <PolicyPage title="Delete your Replylane data">
  <p>You can stop the Instagram connection or request deletion of your full Replylane workspace. These actions have different effects.</p>
  <h2>Disconnect Instagram</h2>
  <ol><li>Sign in to <a href="https://app.replylane.si/">app.replylane.si</a>.</li><li>Open Settings, choose Disconnect, and confirm.</li></ol>
  <p>This removes the saved Instagram connection and access token, pauses your automations and stops queued replies. It leaves your saved rules, activity and other workspace records available until you request deletion.</p>
  <h2>Revoke access on Instagram</h2>
  <p>In Instagram, open Settings → Apps and websites → Active, select ReplyLane-IG, and remove its access. Instagram also provides an <a href="https://www.instagram.com/accounts/manage_access/">Apps and websites page</a>. Revoking permissions does not by itself erase data already saved in Replylane.</p>
  <h2>Request deletion of your workspace</h2>
  <ol>
   <li>Email <a href="mailto:hello@replylane.si?subject=Replylane%20data%20deletion">hello@replylane.si</a> with the subject “Replylane data deletion”.</li>
   <li>Include the Instagram username connected to your workspace. Never include your password, access token or verification codes.</li>
   <li>We will verify ownership before processing the request and confirm the outcome or explain any information we must retain.</li>
  </ol>
  <p>Workspace deletion covers the associated profile and access credentials, login/session records, automation rules, stored message and test activity, usage records and opt-out records. Automations will stop. Necessary accounting, security or legal records and copies in provider backups may remain for their applicable retention period.</p>
  <p>Deleting Replylane data does not delete messages already delivered on Instagram, your Instagram account, or records held independently by Meta or a payment provider. Manage those directly with the relevant provider.</p>
  <p>Questions about your information can be sent to <a href="mailto:hello@replylane.si">hello@replylane.si</a>. Read our <Link href="/privacy">privacy notice</Link> for the information Replylane processes.</p>
 </PolicyPage>;
}
