"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FacebookIcon } from "@/components/facebook-icon";
import { ReplyLaneBrand } from "@/components/replylane-brand";
import { Camera, LoaderCircle } from "lucide-react";

type Account = { id: string; username: string; name: string; pictureUrl: string; pageName: string };

export default function ChooseAccount() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/facebook/accounts", { signal: controller.signal })
      .then(async response => {
        const value = await response.json() as { accounts: Account[]; error?: string };
        if (!response.ok) throw new Error(value.error || "Couldn’t load your accounts.");
        setAccounts(value.accounts);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const choose = async (accountId: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/facebook/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const value = await response.json() as { url: string; error?: string };
      if (!response.ok) throw new Error(value.error || "Couldn’t connect your account.");
      location.assign(value.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection failed.");
      setBusy(false);
    }
  };

  return (
    <main className="account-picker">
      <ReplyLaneBrand href="/" />
      <section className="login-card" aria-labelledby="account-picker-title">
        <div className="setup-icon"><FacebookIcon /></div>
        <div className="login-card-kicker">A PLACE FOR YOUR CONVERSATIONS</div>
        <h1 id="account-picker-title">Choose your Instagram.</h1>
        <p>These professional accounts are linked to the Facebook Pages you approved. Choose the one you’d like to bring to ReplyLane.si.</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {loading ? (
          <p role="status"><LoaderCircle className="animate-spin" />Loading your accounts…</p>
        ) : (
          <div className="account-options">
            {accounts.map(account => (
              <button className="account-option" key={account.id} disabled={busy} onClick={() => void choose(account.id)}>
                {account.pictureUrl ? <Image unoptimized width={44} height={44} src={account.pictureUrl} alt="" referrerPolicy="no-referrer" /> : <span className="setup-icon"><Camera /></span>}
                <span><strong>@{account.username}</strong><small>{account.name} · {account.pageName}</small></span>
                <span>{busy ? "Connecting…" : "Connect"}</span>
              </button>
            ))}
          </div>
        )}
        <Link className="text-btn" href="/" prefetch={false}>Back to sign-in</Link>
      </section>
    </main>
  );
}
