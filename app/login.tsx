"use client";

import { useEffect, useState } from "react";
import { FacebookIcon } from "@/components/facebook-icon";
import { LaneMark, ReplyLaneBrand } from "@/components/replylane-brand";
import { ArrowRight, Camera, Check, ShieldCheck } from "lucide-react";

const errors: Record<string, string> = {
  account_conflict: "This account is already connected to a workspace. Use your original sign-in method, then link the other login from Settings.",
  no_accounts: "No eligible Instagram account was found. Link a Business or Creator Instagram account to a Facebook Page, then grant access to that Page.",
  connection_failed: "We couldn’t finish connecting your account. Sign-in may have expired, been cancelled, or be missing permissions. Please try again.",
};

export default function Login({ instagram, facebook }: { instagram: boolean; facebook: boolean }) {
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(location.search).get("connect_error");
    if (code) {
      queueMicrotask(() => setError(errors[code] || errors.connection_failed));
      history.replaceState(null, "", "/");
    }
  }, []);

  return (
    <main className="login-shell">
      <header className="login-topbar">
        <ReplyLaneBrand className="login-brand" />
        <span className="login-signature">Good conversations go places.</span>
      </header>
      <div className="login-grid">
        <section className="login-story">
          <div className="eyebrow">SUPER INTELLIGENCE. A HUMAN TOUCH.</div>
          <h1>Keep your voice.<br /><em>Find your flow.</em></h1>
          <p>A thoughtful workspace for your Instagram conversations. Turn a comment into a helpful reply, in words that feel like you.</p>
          <ol className="login-steps">
            <li>
              <span>01</span>
              <div><strong>Bring your account</strong><p>Your Instagram profile and posts, in one calm workspace.</p></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>Make the words yours</strong><p>Choose a post, a keyword, and the message to send.</p></div>
            </li>
            <li>
              <span>03</span>
              <div><strong>Give it a little test</strong><p>Preview your reply, then turn it on when it feels right.</p></div>
            </li>
          </ol>
          <p className="login-note">Your words. Your rules. Your lane.</p>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <div className="setup-icon"><LaneMark size={30} /></div>
          <div className="login-card-kicker">LET’S GET YOU SETTLED</div>
          <h2 id="login-title">Welcome to your lane.</h2>
          <p>Connect your Instagram. Make room for what comes next.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="login-buttons">
            {instagram ? (
              <a className="primary-btn" href="/api/instagram/connect?intent=login"><Camera size={18} />Continue with Instagram<ArrowRight size={16} /></a>
            ) : (
              <button className="primary-btn" disabled><Camera size={18} />Instagram login coming soon</button>
            )}
            {facebook ? (
              <a className="secondary-btn" href="/api/facebook/connect?intent=login"><FacebookIcon size={18} />Continue with Facebook</a>
            ) : (
              <button className="secondary-btn" disabled><FacebookIcon size={18} />Facebook login coming soon</button>
            )}
          </div>
          {!instagram && !facebook && <p className="login-availability" role="status">Social sign-in is awaiting the app owner’s Meta setup. Please check back soon.</p>}
          <div className="login-requirements">
            <span><Check size={15} />Instagram Business or Creator account</span>
            <span><Check size={15} />For Facebook: a linked Facebook Page</span>
          </div>
          <div className="login-trust"><ShieldCheck size={18} /><span>Your password stays with Instagram or Facebook. ReplyLane.si receives only the access you approve.</span></div>
        </section>
      </div>
    </main>
  );
}
