"use client";

import Image from "next/image";
import { Camera, Check, ChevronRight, FlaskConical, Plus, RefreshCw } from "lucide-react";

export type ConnectedProfile = { username: string; instagramId: string; expiresAt: number; provider: string; pageId: string; name: string; pictureUrl: string; followers: number | null; mediaCount: number | null };

type InstagramSetupProps = {
  account: ConnectedProfile;
  asOf: number;
  hasDrafts: boolean;
  live: boolean;
  paid: boolean;
  onCreate: () => void;
  onReconnect: () => void;
  onTest: () => void;
  onBilling: () => void;
};

export function InstagramSetup({ account, asOf, hasDrafts, live, paid, onCreate, onReconnect, onTest, onBilling }: InstagramSetupProps) {
  const expired = account.expiresAt <= asOf;

  return (
    <section className="instagram-setup" aria-labelledby="instagram-setup-title">
      <div className="profile-summary">
        {account.pictureUrl ? (
          <Image unoptimized width={65} height={65} className="profile-photo" src={account.pictureUrl} alt={`${account.username} profile`} referrerPolicy="no-referrer" />
        ) : (
          <div className="profile-photo profile-placeholder"><Camera /></div>
        )}
        <div className="profile-description">
          <div className="eyebrow">{expired ? "LET’S GET YOU RECONNECTED" : "YOUR INSTAGRAM, RIGHT AT HOME"}</div>
          <h2 id="instagram-setup-title">{account.name || account.username}</h2>
          <p>@{account.username} · Connected through {account.provider === "facebook" ? "Facebook" : "Instagram"}</p>
          <div className="profile-counts">
            {account.followers !== null && <span><strong>{account.followers.toLocaleString()}</strong> followers</span>}
            {account.mediaCount !== null && <span><strong>{account.mediaCount.toLocaleString()}</strong> posts</span>}
          </div>
        </div>
        <button className="secondary-btn" onClick={onReconnect}><RefreshCw size={14} />{expired ? "Reconnect account" : "Manage connection"}</button>
      </div>
      <div className="onboarding-path">
        <div className="onboarding-step complete"><Check size={16} /><span>Account connected</span></div>
        <ChevronRight size={14} />
        <button className="onboarding-step" onClick={onCreate}><Plus size={16} /><span>{hasDrafts ? "Create another reply" : "Create your first reply"}</span></button>
        <ChevronRight size={14} />
        <button className="onboarding-step" disabled={!hasDrafts} onClick={onTest}><FlaskConical size={16} /><span>Test your automation</span></button>
      </div>
      {expired ? (
        <p className="onboarding-note">Your Instagram access has expired. Reconnect to bring in your posts and resume your replies.</p>
      ) : !paid ? (
        <p className="onboarding-note">Find your words. Try a reply. <button className="text-btn" onClick={onBilling}>Choose a plan</button> when you’re ready to send.</p>
      ) : !live ? (
        <p className="onboarding-note">Your replies are ready to create and test. Live sending will be available once the app’s delivery setup is complete.</p>
      ) : (
        <p className="onboarding-note">Create a reply, give it a test, then turn it on. We’ll take it from there.</p>
      )}
    </section>
  );
}
