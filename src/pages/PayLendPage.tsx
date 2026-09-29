import { useState, type ReactNode } from 'react'
import { ArrowRight, BellRing, Check, CreditCard, HandCoins, Mic, ScanLine, ShieldCheck, Sparkles, Zap } from 'lucide-react'

const features = [
  { icon: CreditCard, title: 'Pay directly', copy: 'Send a settlement from the balance screen through verified payment partners.', badge: 'Core' },
  { icon: Mic, title: 'Speak an expense', copy: 'Say “I lent Kabir ₹800 for tickets” and review the prepared ledger entry.', badge: 'Voice' },
  { icon: Zap, title: 'One-tap lend', copy: 'Record common loans and splits instantly from configurable quick actions.', badge: 'Fast' },
  { icon: ScanLine, title: 'Scan and split', copy: 'Capture a receipt, assign items, tax, and tip, then settle the balance.', badge: 'Smart' },
]

export function PayLendPage({ topbar }: { topbar: ReactNode }) {
  const [joined, setJoined] = useState(false)

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content pay-page">
        <section className="pay-hero">
          <div>
            <span className="coming-soon-pill"><Sparkles size={13} /> Work in progress · introducing soon</span>
            <h1>Pay, lend, or split<br />in a single moment.</h1>
            <p>A new Fairshare space for moving money and recording it at the same time—designed for speed, clarity, and explicit confirmation.</p>
            <div className="pay-hero__actions">
              <button className={`button ${joined ? 'button--soft' : 'button--primary'}`} onClick={() => setJoined(true)}>
                {joined ? <><Check size={17} /> You’re on the preview list</> : <><BellRing size={17} /> Join early access</>}
              </button>
              <span>No payment connection is active yet.</span>
            </div>
          </div>
          <div className="pay-phone-preview">
            <header><span>Pay & Lend</span><i>Preview</i></header>
            <div className="pay-orb"><HandCoins size={31} /><strong>₹1,250</strong><span>to Maya</span></div>
            <button><Mic size={18} /> “Split dinner with Maya”</button>
            <footer><ShieldCheck size={14} /> Review before anything is sent</footer>
          </div>
        </section>

        <section className="pay-feature-section">
          <div className="section-heading"><div><h2>What we’re building</h2><p>Each flow will create a matching, auditable ledger record.</p></div></div>
          <div className="pay-feature-grid">
            {features.map(({ icon: Icon, title, copy, badge }) => (
              <article key={title}>
                <header><span><Icon size={21} /></span><i>{badge}</i></header>
                <h3>{title}</h3><p>{copy}</p><button disabled>Preview soon <ArrowRight size={14} /></button>
              </article>
            ))}
          </div>
        </section>

        <section className="pay-safety">
          <ShieldCheck size={25} />
          <div><strong>Money movement needs production infrastructure</strong><p>Before launch we’ll add a regulated payment partner, verified identities, consent screens, signed webhooks, fraud controls, refunds, and store-compliant disclosures. Fairshare will never mark a transfer complete until the provider confirms it.</p></div>
        </section>

        <section className="pay-roadmap">
          <h2>Preview roadmap</h2>
          <div>
            <article><span>01</span><strong>Record</strong><p>One-tap lending and voice-created drafts.</p></article>
            <article><span>02</span><strong>Connect</strong><p>UPI and supported payment providers.</p></article>
            <article><span>03</span><strong>Confirm</strong><p>Automatic settlement after verified payment.</p></article>
            <article><span>04</span><strong>Expand</strong><p>Receipt intelligence and recurring transfers.</p></article>
          </div>
        </section>
      </div>
    </main>
  )
}
