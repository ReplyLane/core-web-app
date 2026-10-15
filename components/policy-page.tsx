import Link from "next/link";
import type { ReactNode } from "react";
import { ReplyLaneBrand } from "@/components/replylane-brand";
import "@/app/policy.css";

export function PolicyPage({title,children}:{title:string;children:ReactNode}) {
 return <div className="policy-shell">
  <header className="policy-header"><Link href="https://replylane.si/" aria-label="Replylane home"><ReplyLaneBrand/></Link><a href="https://app.replylane.si/">Open app ↗</a></header>
  <main className="policy-content">
   {process.env.NODE_ENV!=="production"&&<aside className="policy-draft">Draft for review. These pages have not been approved for publication.</aside>}
   <p className="policy-kicker">REPLYLANE · YOUR INFORMATION</p><h1>{title}</h1>
   <p className="policy-updated">Updated 15 October 2026</p>
   {children}
  </main>
  <footer className="policy-footer"><Link href="/privacy">Privacy</Link><Link href="/data-deletion">Data deletion</Link><a href="mailto:hello@replylane.si">hello@replylane.si</a></footer>
 </div>;
}
