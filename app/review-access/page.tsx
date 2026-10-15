import { headers } from "next/headers";
import Link from "next/link";
import { ReplyLaneBrand } from "@/components/replylane-brand";
import { currentUser, db, runtime } from "@/lib/server";
import { ReviewAccessForm } from "./review-access-form";
import "../policy.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review access | Replylane", robots: { index: false, follow: false } };

export default async function ReviewAccessPage() {
  const user = await currentUser(new Request(runtime().APP_ORIGIN || "http://localhost:5173", { headers: await headers() }));
  const account = user ? await db().prepare("SELECT username FROM accounts WHERE user_id=?").bind(user.userId).first<{ username: string }>() : null;
  return <main className="policy-shell">
    <header className="policy-header"><Link href="/"><ReplyLaneBrand compact /></Link><Link href="/">Open workspace</Link></header>
    <section className="policy-content">
      <h1>Review access</h1>
      <p>An invitation provides up to 25 real test replies for seven days, limited to your connected Instagram account. No payment details are required. It does not activate any automation.</p>
      {!user ? <><p>Sign in with your Instagram Business or Creator account, then return to this page to enter the invitation supplied in your review instructions.</p><Link className="primary-btn" href="/">Sign in to Replylane</Link></>
        : !account ? <><p>Connect your Instagram account in Settings, then return here.</p><Link href="/">Open your workspace</Link></>
          : <ReviewAccessForm username={account.username} />}
    </section>
    <footer className="policy-footer"><Link href="/privacy">Privacy notice</Link><Link href="/data-deletion">Data deletion</Link><a href="mailto:hello@replylane.si">hello@replylane.si</a></footer>
  </main>;
}
