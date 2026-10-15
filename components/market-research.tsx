import { ArrowUpRight } from "lucide-react";
import { LaneMark } from "@/components/replylane-brand";

const alternatives = [
  { name: "Manychat", plan: "Essential", price: "$14 / month", cadence: "$168 billed annually", allowance: "250 active contacts / month", detail: "Additional active contacts cost extra.", source: "https://manychat.com/pricing" },
  { name: "LinkDM", plan: "Pro", price: "$19 / month", cadence: "Billed monthly", allowance: "3 Instagram accounts · 25,000 DMs / month", detail: "Usage is measured in messages.", source: "https://www.linkdm.com/pricing" },
  { name: "CreatorFlow", plan: "Pro", price: "$15 / month", cadence: "Or $144 / year ($12 / month equivalent)", allowance: "2 accounts · 5,000 DMs / workspace / month", detail: "Check the provider’s workspace definition.", source: "https://creatorflow.so/pricing" },
  { name: "InstantDM", plan: "Legend Pro", price: "$9.99 / month", cadence: "Billed yearly", allowance: "1 Instagram account · unlimited monthly DM automations", detail: "Advertised sending cap: 800 / hour; platform limits apply.", source: "https://instantdm.com/pricing" },
  { name: "Inrō", plan: "Pro", price: "From €12.99 / month", cadence: "Billed monthly", allowance: "500+ active contacts / month", detail: "Contact-based pricing scales with usage.", source: "https://www.inro.social/pricing" },
];

export function MarketResearch() {
  return <section className="lane-market marketing-width" id="market-research" aria-labelledby="market-research-title">
    <div className="lane-market-heading"><div><div className="lane-kicker">04 / MARKET RESEARCH</div><h2 id="market-research-title">A little context.<br/><em>A clearer choice.</em></h2></div><p>Compare the starting plans, then choose the fit for your conversations. Contacts, accounts and message allowances measure different things.</p></div>
    <div className="lane-market-scroll" role="region" aria-label="Automation pricing comparison" tabIndex={0}><table className="lane-market-table"><caption className="sr-only">Replylane and five Instagram automation alternatives. Public prices checked 16 October 2026.</caption><thead><tr><th scope="col">Tool</th><th scope="col">Starting paid price</th><th scope="col">What’s included</th></tr></thead><tbody>
      <tr className="lane-market-own"><th scope="row"><span><LaneMark size={24}/>Replylane</span><small>Our focused Instagram workspace</small></th><td data-label="Starting price"><strong>$2.99 / month</strong><small>Or $24.99 / year</small></td><td data-label="Allowance"><strong>1 account · 1,000 automated DMs / month</strong><small>Comment-to-DM, keyword replies, previews and activity.</small><a href="https://app.replylane.si/">Explore Replylane <ArrowUpRight size={12}/></a></td></tr>
      {alternatives.map(tool => <tr key={tool.name}><th scope="row"><a href={tool.source} target="_blank" rel="noreferrer">{tool.name}<ArrowUpRight size={13}/></a><small>{tool.plan}</small></th><td data-label="Starting price"><strong>{tool.price}</strong><small>{tool.cadence}</small></td><td data-label="Allowance"><strong>{tool.allowance}</strong><small>{tool.detail}</small></td></tr>)}
    </tbody></table></div>
    <div className="lane-market-notes"><p>Public starting prices checked 16 October 2026. Annual prices require annual payment. Providers measure usage differently; follow each tool’s pricing link for full limits and current terms.</p><p>Replylane’s live sending requires an eligible Instagram account, sending access and platform permissions. Checkout availability depends on payment setup.</p></div>
    <div className="lane-market-fit"><div><span className="lane-kicker">FIND YOUR FIT</span><h3>Start with the work<br/>you want to <em>simplify.</em></h3></div><p>Replylane focuses on one Instagram account, comment-to-DM and incoming keyword replies. You write the message, test the match and follow each result. For a broader workflow, compare the other tools’ channel support and usage model before choosing.</p><a href="#how-it-works" className="marketing-text-link">See how Replylane works <ArrowUpRight size={15}/></a></div>
  </section>;
}
