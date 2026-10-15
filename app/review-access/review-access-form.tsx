"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export function ReviewAccessForm({ username }: { username: string }) {
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [trial, setTrial] = useState<{ active: boolean; remaining: number; expiresAt: number } | null>(null);
  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/review-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const value = await response.json() as { error?: string; access: { trial: { active: boolean; remaining: number; expiresAt: number } } };
      if (!response.ok) throw new Error(value.error || "Couldn’t use the invitation. Please try again.");
      setTrial(value.access.trial); setCode("");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t use the invitation. Please try again."); }
    finally { setBusy(false); }
  }
  return <div style={{ maxWidth: 520 }}>
    <p>Connected account: <strong>@{username}</strong></p>
    {trial ? <div role="status"><h2>{trial.active ? "Your review trial is ready" : "Your review trial has ended"}</h2><p>{trial.remaining} test replies remaining. Ends {new Date(trial.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}. Reusing the invitation does not renew the allowance.</p><Link className="primary-btn" href="/">Open your workspace</Link></div>
      : <form onSubmit={claim}>
        <div className="field"><label htmlFor="review-code">Review invitation code</label><input id="review-code" type="password" autoComplete="off" spellCheck={false} value={code} maxLength={60} onChange={e => setCode(e.target.value)} required disabled={busy} /></div>
        {error && <p role="alert" className="error-banner">{error}</p>}
        <button className="primary-btn" type="submit" disabled={busy || !code.trim()}>{busy ? "Checking invitation…" : "Use review invitation"}</button>
      </form>}
  </div>;
}
