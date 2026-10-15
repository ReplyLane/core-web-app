"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Camera as Instagram, Link2, MessageCircle, Pause, SlidersHorizontal } from "lucide-react";
import { LaneMark, ReplyLaneBrand } from "@/components/replylane-brand";
import { MarketResearch } from "@/components/market-research";

const appUrl = "https://app.replylane.si";
const examples = [
  { name: "A product launch", keyword: "LINK", title: "Something good\nis on the way.", caption: "The new collection is here. Comment LINK and I’ll send you the details.", comment: "LINK please!", reply: "So happy this caught your eye. Here’s the new collection — I hope you find something you love.", link: "Explore the collection", initial: "J", person: "jules.creates", tag: "THE NEW COLLECTION", color: "collection" },
  { name: "A useful guide", keyword: "GUIDE", title: "A little knowledge.\nA fresh start.", caption: "I put my favourite tips in one place. Comment GUIDE and it’s yours.", comment: "GUIDE — this looks so helpful", reply: "Here you go! These are the tips I wish I’d had when I started. Let me know which one you try first.", link: "Read your guide", initial: "S", person: "studio.sana", tag: "SOMETHING TO KEEP", color: "guide" },
  { name: "A booking link", keyword: "BOOK", title: "Good things start\nwith a conversation.", caption: "Opening a few appointments this week. Comment BOOK for the booking link.", comment: "BOOK, I’d love to chat", reply: "I’d love that. Here’s my booking page — choose a time that works for you, and we’ll take it from there.", link: "Find a time", initial: "A", person: "alex.makes", tag: "A MOMENT FOR YOU", color: "booking" },
];

function ConversationPreview() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];

  return <div className="lane-preview">
    <div className="lane-preview-heading"><span className="lane-preview-title"><LaneMark /> A reply, in its lane.</span><span className="lane-example-label">INTERACTIVE EXAMPLE</span></div>
    <div className="lane-example-picker" aria-label="Choose an example">{examples.map((item, index) => <button key={item.keyword} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.name}</button>)}</div>
    <div className="lane-preview-content" aria-live="polite" aria-atomic="true">
      <div className={`lane-example-post ${example.color}`}>
        <div className="lane-post-top"><span>YOUR STUDIO</span><span>{String(selected + 1).padStart(2, "0")} / 03</span></div>
        <div className="lane-post-title">{example.title.split("\n").map((line) => <span key={line}>{line}</span>)}</div>
        <div className="lane-post-bottom"><span>{example.tag}</span><span className="lane-post-symbol" aria-hidden="true">↗</span></div>
      </div>
      <div className="lane-example-caption"><Instagram size={14}/><p>{example.caption.split(example.keyword)[0]}<strong>{example.keyword}</strong>{example.caption.split(example.keyword)[1]}</p><Heart size={15}/></div>
      <div className="lane-comment"><span className="lane-person">{example.initial}</span><div><strong>{example.person}</strong><p>{example.comment}</p></div><Heart size={14}/></div>
      <div className="lane-route"><span aria-hidden="true"/><span><Check size={12}/> “{example.keyword}” matched</span><ArrowDown size={14}/></div>
      <div className="lane-message"><div className="lane-message-heading"><LaneMark/><span>Your words. Delivered.</span><span>PRIVATE REPLY</span></div><p>{example.reply}</p><div className="lane-message-link"><Link2 size={13}/>{example.link}<ArrowUpRight size={13}/></div></div>
    </div>
    <div className="lane-preview-foot"><span className="lane-signal"/>Illustrative preview. No message is sent.</div>
  </div>;
}

export default function LandingPage() {
  return <div className="marketing">
    <a className="lane-skip-link" href="#main-content">Skip to content</a>
    <header className="marketing-nav marketing-width">
      <Link href="/" className="lane-home-link" aria-label="ReplyLane.si home"><ReplyLaneBrand/></Link>
      <nav aria-label="Main navigation"><a href="#how-it-works">The simple part</a><a href="#our-approach">Our approach</a><a href="#pricing">Pricing</a><a href="#market-research">Market research</a></nav>
      <a className="lane-button lane-button-small lane-button-outline" href={appUrl}>Open app <ArrowUpRight size={15}/></a>
    </header>

    <main id="main-content">
      <section className="marketing-hero marketing-width">
        <div className="marketing-hero-copy">
          <div className="lane-kicker"><span className="lane-signal"/> SUPER INTELLIGENCE. PERSONAL BY DESIGN.</div>
          <h1>A little less work.<br/>A lot more<br/><em>human</em><span className="lane-headline-dot" aria-hidden="true"/></h1>
          <p>Your audience showed up. Make them feel it. Turn Instagram comments and DMs into thoughtful replies, written by you and delivered with a little help.</p>
          <div className="marketing-actions"><a href={appUrl} className="lane-button lane-button-primary">Find your lane <ArrowUpRight size={18}/></a><a href="#how-it-works" className="marketing-text-link">Take a closer look <ArrowDown size={14}/></a></div>
          <div className="marketing-account-note"><Instagram size={15}/> For Instagram Business & Creator accounts</div>
          <div className="lane-hero-margin-note"><span>LESS COPY. PASTE. REPEAT.</span><span>MORE CONNECTION.</span></div>
        </div>
        <div className="lane-preview-wrap"><div className="lane-preview-note">a small reply can open a big conversation <span aria-hidden="true">↘</span></div><ConversationPreview/><span className="lane-figure-number">FIG. 01 — THE THOUGHTFUL FOLLOW-THROUGH</span></div>
      </section>

      <div className="lane-principles marketing-width" aria-label="The ReplyLane approach"><span>Your voice, always.</span><span><span aria-hidden="true">↗</span> A clear path from comment to conversation.</span><span>Less friction. More intention.</span></div>

      <section className="marketing-how marketing-width" id="how-it-works" aria-labelledby="how-title">
        <div className="marketing-section-intro"><div className="lane-kicker">01 / THE SIMPLE PART</div><h2 id="how-title">From “send me the link”<br/>to <em>“here you go.”</em></h2><p>A few thoughtful choices.<br/>One less thing on your mind.</p></div>
        <ol className="marketing-steps">
          <li><span className="lane-step-number">01</span><div><h3>Bring your Instagram.</h3><p>Connect your professional account through Instagram. Keep your profile, posts, and replies together in one calm workspace.</p></div><Instagram size={21}/></li>
          <li><span className="lane-step-number">02</span><div><h3>Make it sound like you.</h3><p>Choose a post or incoming-message trigger. Set a keyword and write the reply you’d want someone to receive.</p></div><MessageCircle size={21}/></li>
          <li><span className="lane-step-number">03</span><div><h3>Check it. Then let it flow.</h3><p>Preview your message and test the match. When your account is ready, switch it on and follow the activity.</p></div><SlidersHorizontal size={21}/></li>
        </ol>
      </section>

      <section className="lane-approach" id="our-approach" aria-labelledby="approach-title"><div className="marketing-width lane-approach-layout">
        <div className="lane-approach-art" aria-hidden="true"><span className="lane-art-label">HUMAN INTENTION → THOUGHTFUL AUTOMATION</span><div className="lane-art-mark"><LaneMark/></div><div className="lane-art-foot"><span>YOUR WORDS.</span><span>A LITTLE MORE REACH.</span></div></div>
        <div className="lane-approach-copy"><div className="lane-kicker">02 / OUR APPROACH</div><h2 id="approach-title">Super Intelligence.<br/><em>Human intention.</em></h2><p>We believe useful intelligence makes room for the person behind the work. Your voice. Your judgment. Your way of connecting.</p><p>That’s the idea behind ReplyLane.si. You set the keywords and write the messages. We take care of the repeatable steps, so the conversations still feel like yours.</p><div className="lane-control-note"><Pause size={16}/><span>Preview before sending. Pause when you need to.<br/>Stay in control of every automation.</span></div></div>
      </div></section>

      <section className="lane-use-cases marketing-width" aria-labelledby="use-title"><div className="lane-use-heading"><div className="lane-kicker">SMALL MOMENTS. GOOD FOLLOW-THROUGHS.</div><h2 id="use-title">Give a good conversation<br/><em>somewhere to go.</em></h2></div><div className="lane-use-list">
        <div><span className="lane-use-number">01</span><h3>A comment.<br/>A private reply.</h3><p>A product they noticed. A guide they asked for. A booking they’re ready to make. Share the right link when their comment matches your keyword.</p><span className="lane-keyword-flow"><span>“LINK”</span><ArrowRight size={15}/><span>Your thoughtful reply</span></span></div>
        <div><span className="lane-use-number">02</span><h3>A familiar question.<br/>A helpful answer.</h3><p>Some DMs come around again and again. Give common questions a reply you’ve already written, and save your attention for what comes next.</p><span className="lane-keyword-flow"><span>“DETAILS”</span><ArrowRight size={15}/><span>The answer, ready</span></span></div>
      </div></section>

      <section className="lane-pricing marketing-width" id="pricing" aria-labelledby="pricing-title"><div className="lane-pricing-heading"><div className="lane-kicker">03 / A LITTLE MORE ROOM</div><h2 id="pricing-title">Simple plans.<br/><em>Same thoughtful tools.</em></h2><p>One Instagram account. 1,000 automated DMs each month. No per-contact charges.</p><ul>{["Comment-to-DM & keyword replies", "Up to 100 saved automations", "Message preview & test console", "No ReplyLane.si branding in your messages"].map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul></div><div className="lane-price-options"><div className="lane-price-option"><div><span className="lane-kicker">KEEP IT FLEXIBLE</span><h3>Monthly</h3></div><div className="lane-price">$2.99<span>USD / month</span></div><p>Billed monthly. Cancel renewal anytime.</p><a href={appUrl} className="lane-button lane-button-outline">Choose monthly <ArrowUpRight size={16}/></a></div><div className="lane-price-option lane-price-annual"><div><span className="lane-kicker">SETTLE IN · SAVE 30%</span><h3>Yearly</h3></div><div className="lane-price">$24.99<span>USD / year</span></div><p>About $2.08 per month, billed annually.</p><a href={appUrl} className="lane-button lane-button-primary">Choose yearly <ArrowUpRight size={16}/></a></div><p className="lane-pricing-note">Choose your plan in the app. Checkout availability and payment options depend on the gateway setup. Live sending requires an eligible account and platform permissions.</p></div></section>

      <MarketResearch/>

      <section className="marketing-faq marketing-width" id="questions" aria-labelledby="questions-title"><div><div className="lane-kicker">A FEW THINGS TO KNOW</div><h2 id="questions-title">Before you<br/><em>pick your lane.</em></h2><a className="marketing-text-link" href="mailto:hello@replylane.si">Let’s talk <ArrowUpRight size={15}/></a></div><div className="marketing-faq-items">
        <details><summary>What does Super Intelligence mean here?<ChevronDown size={17}/></summary><p>It’s our approach to useful, thoughtful automation: less repetitive work, with a person in control. ReplyLane.si matches keywords and sends messages you write. Your voice and judgment stay at the centre.</p></details>
        <details><summary>Which Instagram accounts can connect?<ChevronDown size={17}/></summary><p>Instagram Business and Creator accounts can connect through Instagram’s authorization screen. You choose the access to approve. Your Instagram password stays with Instagram. Direct Instagram sign-in does not require a linked Facebook Page.</p></details>
        <details><summary>Can I check my reply before it goes out?<ChevronDown size={17}/></summary><p>Yes. Save your automation as a draft, preview the message, and test its keyword matching in the workspace before activation. You can pause it whenever you need to.</p></details>
        <details><summary>When can an automated message be sent?<ChevronDown size={17}/></summary><p>Replies are sent in response to eligible comments or incoming messages within Instagram’s permitted reply windows. Live sending needs an active plan, an authorized account, and completed platform delivery setup. Recipient opt-outs are respected.</p></details>
        <details><summary>How do I follow my subscription?<ChevronDown size={17}/></summary><p>Your workspace’s Billing page shows your subscription status, billing interval, access period, and monthly message usage. You can cancel renewal there. Payment is confirmed by the payment gateway before paid access is activated.</p></details>
      </div></section>

      <section className="marketing-final marketing-width"><div><div className="lane-kicker">GOOD THINGS START WITH A REPLY.</div><h2>Make room for<br/><em>the human part.</em></h2></div><div><a href={appUrl} className="lane-button lane-button-primary">Find your lane <ArrowUpRight size={18}/></a><p>Connect. Write. Preview.<br/>Take it from there.</p></div><div className="lane-final-line" aria-hidden="true"><span/><span/><span/></div></section>
    </main>

    <footer className="marketing-footer marketing-width"><Link href="/" className="lane-home-link" aria-label="ReplyLane.si home"><ReplyLaneBrand/></Link><span>Super Intelligence. Human intention.</span><div><a href="https://www.instagram.com/reply.lane/" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={12}/></a><a href="mailto:hello@replylane.si">Contact</a><a href="#market-research">Market research</a><Link href="/privacy">Privacy</Link><Link href="/data-deletion">Data deletion</Link><a href={appUrl}>Open app <ArrowUpRight size={12}/></a></div><p className="marketing-operator">Replylane is operated by BlockC School Private Limited, India.</p></footer>
  </div>;
}
