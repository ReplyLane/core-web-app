"use client";

import { ChevronRight, RefreshCw } from "lucide-react";

export type BillingSnapshot = {
  status: string;
  interval: string;
  currentStart: number;
  currentEnd: number;
  nextChargeAt: number;
  cancelAtEnd: boolean;
  subscriptionId: string | null;
  paymentId: string | null;
  paymentStatus: string;
  updatedAt: number;
  hasPaidAccess: boolean;
  canResumeCheckout: boolean;
  canCancel: boolean;
};

const statusLabels: Record<string, string> = {
  creating: "Preparing checkout",
  created: "Checkout pending",
  authenticated: "Payment pending",
  active: "Active",
  pending: "Payment pending",
  halted: "Payment needs attention",
  paused: "Subscription paused",
  cancelled: "Subscription cancelled",
  completed: "Subscription complete",
  expired: "Subscription expired",
  refunded: "Payment refunded",
  checkout_error: "Checkout not completed",
  checkout_uncertain: "Checkout needs review",
};

export function paymentAwaitingConfirmation(billing: BillingSnapshot | null) {
  return !!billing && (["created", "authenticated", "pending"].includes(billing.status) ||
    (billing.status === "active" && !billing.hasPaidAccess && !billing.currentEnd));
}

function date(seconds: number) {
  return seconds ? new Date(seconds * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Awaiting confirmation";
}

export function SubscriptionSummary({ billing, busy, onRefresh, onResume, onCancel }: {
  billing: BillingSnapshot;
  busy: boolean;
  onRefresh: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const pending = paymentAwaitingConfirmation(billing);
  const label = billing.status === "active" && !billing.hasPaidAccess
    ? pending ? "Payment pending" : "Paid access ended"
    : statusLabels[billing.status] || "Subscription update pending";
  const stopped = billing.cancelAtEnd || ["cancelled", "completed", "expired"].includes(billing.status);
  const dateLabel = stopped && billing.hasPaidAccess ? "Paid access through"
    : !stopped && billing.nextChargeAt ? "Next payment" : "Confirmed period ends";
  const shownDate = !stopped && billing.nextChargeAt ? billing.nextChargeAt : billing.currentEnd;
  const paymentLabels: Record<string, string> = {
    awaiting_payment: "Awaiting payment", captured: "Payment confirmed", authorized: "Authorized · confirmation pending",
    failed: "Payment failed", refunded: "Payment refunded", partially_refunded: "Partially refunded",
  };
  let note = billing.hasPaidAccess
    ? stopped ? "Future billing is stopped. Your confirmed paid access continues through the date above."
      : "Your payment is confirmed. You can stop future billing whenever you need to."
    : pending ? "Paid access starts after Razorpay confirms a captured payment. This status refreshes automatically."
      : "There is no current confirmed paid access. Your saved automations stay in your workspace.";
  if (billing.status === "checkout_uncertain" || billing.status === "creating") {
    note = "We’re confirming whether checkout was created. Contact support before starting another payment, so you avoid duplicate billing.";
  }

  return <section className="billing-current" aria-label="Your subscription">
    <div className="billing-current-top">
      <div><div className="eyebrow">YOUR CREATOR PLAN</div><h2>A little room to create.</h2></div>
      <div className="billing-current-actions">
        <span className={`status ${billing.hasPaidAccess ? "active" : ""}`}>{label}</span>
        <button className="text-btn" disabled={busy} onClick={onRefresh}><RefreshCw size={13} />Refresh status</button>
      </div>
    </div>
    <dl className="billing-facts">
      <div><dt>Billing cycle</dt><dd>{billing.interval === "yearly" ? "Yearly · $24.99 USD" : "Monthly · $2.99 USD"}</dd></div>
      <div><dt>{dateLabel}</dt><dd>{date(shownDate)}</dd></div>
      <div><dt>Subscription reference</dt><dd><code>{billing.subscriptionId || "Awaiting checkout confirmation"}</code></dd></div>
      <div><dt>Latest payment</dt><dd>{paymentLabels[billing.paymentStatus] || "Payment update pending"}{billing.paymentId && <><br /><code>{billing.paymentId}</code></>}</dd></div>
    </dl>
    <p className="billing-current-note">{note} {["checkout_uncertain", "creating", "halted"].includes(billing.status) && <a href="mailto:hello@replylane.si">Contact support ↗</a>}</p>
    <div className="billing-summary-buttons">
      {billing.canResumeCheckout && <button className="primary-btn" disabled={busy} onClick={onResume}>Continue checkout<ChevronRight size={14} /></button>}
      {billing.canCancel && <button className="text-btn" disabled={busy} onClick={onCancel}>{billing.status === "created" ? "Cancel checkout" : "Stop future billing"}</button>}
    </div>
  </section>;
}
