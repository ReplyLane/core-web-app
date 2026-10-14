import type { CSSProperties } from "react";

/** Three conversations, finding a shared lane. Drawn for ReplyLane.si. */
export function LaneMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={`lane-mark ${className}`} aria-hidden="true">
      <path d="M5 10h11c8 0 8 20 16 20h3M5 20h10c8 0 9 10 17 10M5 30h30" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="10" r="4" fill="var(--brand-clay, #b75a3c)" />
    </svg>
  );
}

export function ReplyLaneBrand({ className = "", compact = false, href, style }: { className?: string; compact?: boolean; href?: string; style?: CSSProperties }) {
  const content = <><LaneMark size={compact ? 28 : 35} /><span className="brand-word">ReplyLane<span className="brand-domain">.si</span></span></>;
  return href ? <a href={href} className={`brand replylane-brand ${className}`} style={style} aria-label="ReplyLane.si home">{content}</a> : <div className={`brand replylane-brand ${className}`} style={style}>{content}</div>;
}
