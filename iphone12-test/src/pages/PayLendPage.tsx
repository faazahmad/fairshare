import { useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, BellRing, Check, CreditCard, HandCoins, Landmark, Mic, QrCode, ScanLine, ShieldCheck, Sparkles, WalletCards, Zap } from 'lucide-react'
import type { LedgerState } from '../domain/types'
import { currencySymbol, formatMoney, parseMoney } from '../domain/money'
import { findUser } from '../lib/ledger'

type PaymentMethod = 'wallet' | 'upi' | 'debit' | 'credit'

const methods = [
  { id: 'wallet' as const, icon: WalletCards, title: 'Fairshare wallet', copy: 'Use your built-in wallet balance', badge: 'Built in' },
  { id: 'upi' as const, icon: QrCode, title: 'UPI', copy: 'Choose a UPI app or scan a code', badge: 'Instant' },
  { id: 'debit' as const, icon: Landmark, title: 'Debit card', copy: 'Pay from a verified bank card', badge: 'Card' },
  { id: 'credit' as const, icon: CreditCard, title: 'Credit card', copy: 'Pay using an eligible credit card', badge: 'Card' },
]

const features = [
  { icon: CreditCard, title: 'Pay directly', copy: 'Send a settlement from the balance screen through verified payment partners.', badge: 'Core' },
  { icon: Mic, title: 'Speak an expense', copy: 'Say “I lent Kabir ₹800 for tickets” and review the prepared ledger entry.', badge: 'Voice' },
  { icon: Zap, title: 'One-tap lend', copy: 'Record common loans and splits instantly from configurable quick actions.', badge: 'Fast' },
  { icon: ScanLine, title: 'Scan and split', copy: 'Capture a receipt, assign items, tax, and tip, then settle the balance.', badge: 'Smart' },
]

export function PayLendPage({ state, topbar }: { state: LedgerState; topbar: ReactNode }) {
  const currentUser = findUser(state.users, state.currentUserId)
  const currency = currentUser.defaultCurrency ?? 'INR'
  const recipients = state.users.filter((user) => user.id !== state.currentUserId)
  const [joined, setJoined] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('wallet')
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? '')
  const [amount, setAmount] = useState('1250')
  const [previewReady, setPreviewReady] = useState(false)
  const [error, setError] = useState('')
  const selectedMethod = methods.find((entry) => entry.id === method) ?? methods[0]!
  const recipient = recipients.find((entry) => entry.id === recipientId) ?? recipients[0]
  const previewAmount = useMemo(() => parseMoney(amount), [amount])

  function preparePreview(event: React.FormEvent) {
    event.preventDefault()
    if (!recipient) { setError('Choose a person to pay.'); setPreviewReady(false); return }
    if (!previewAmount) { setError('Enter a valid amount with no more than two decimals.'); setPreviewReady(false); return }
    setError('')
    setPreviewReady(true)
  }

  return (
    <main className="main-panel page-panel" id="top">{topbar}<div className="content page-content pay-page">
      <section className="pay-hero"><div><span className="coming-soon-pill"><Sparkles size={13} /> Work in progress · introducing soon</span><h1>Pay, lend, or split<br />in a single moment.</h1><p>A new Fairshare space for moving money and recording it at the same time—designed for speed, clarity, and explicit confirmation.</p><div className="pay-hero__actions"><button className={`button ${joined ? 'button--soft' : 'button--primary'}`} onClick={() => setJoined(true)}>{joined ? <><Check size={17} /> You’re on the preview list</> : <><BellRing size={17} /> Join early access</>}</button><span>No live payment connection is active yet.</span></div></div><div className="pay-phone-preview"><header><span>Pay & Lend</span><i>Interactive preview</i></header><div className="pay-orb"><HandCoins size={31} /><strong>{previewAmount ? formatMoney(previewAmount, currency) : `${currencySymbol(currency)}0.00`}</strong><span>to {recipient?.name.split(' ')[0] ?? 'a friend'} · {selectedMethod.title}</span></div><button type="button"><Mic size={18} /> “Split dinner with {recipient?.name.split(' ')[0] ?? 'a friend'}”</button><footer><ShieldCheck size={14} /> Review before anything is sent</footer></div></section>

      <section className="pay-method-section">
        <div className="section-heading"><div><h2>Choose how you’ll pay</h2><p>Explore the wallet, UPI, debit-card, and credit-card flows before payment partners go live.</p></div><span className="preview-only-badge">Preview only</span></div>
        <div className="payment-method-grid" role="radiogroup" aria-label="Payment method">
          {methods.map(({ id, icon: Icon, title, copy, badge }) => <button key={id} type="button" role="radio" aria-checked={method === id} className={method === id ? 'is-active' : ''} onClick={() => { setMethod(id); setPreviewReady(false) }}><span><Icon size={21} /></span><span><strong>{title}</strong><small>{copy}</small></span><i>{badge}</i>{method === id && <Check size={15} />}</button>)}
        </div>
        <form className="payment-preview-form" onSubmit={preparePreview}>
          <label className="field"><span>Pay to</span><select value={recipientId} onChange={(event) => { setRecipientId(event.target.value); setPreviewReady(false) }}>{recipients.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label>
          <label className="field"><span>Amount</span><span className="input-with-icon"><strong>{currencySymbol(currency)}</strong><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setPreviewReady(false) }} placeholder="0.00" /></span></label>
          <button className="button button--primary" type="submit">Prepare secure preview <ArrowRight size={16} /></button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        {previewReady && previewAmount && recipient && <div className="payment-preview-result" role="status"><span><Check size={18} /></span><div><strong>{formatMoney(previewAmount, currency)} to {recipient.name} via {selectedMethod.title}</strong><p>The review flow is ready. No money has moved; live confirmation will activate only after a regulated provider is connected.</p></div></div>}
      </section>

      <section className="pay-feature-section"><div className="section-heading"><div><h2>What we’re building</h2><p>Each flow will create a matching, auditable ledger record.</p></div></div><div className="pay-feature-grid">{features.map(({ icon: Icon, title, copy, badge }) => <article key={title}><header><span><Icon size={21} /></span><i>{badge}</i></header><h3>{title}</h3><p>{copy}</p><button disabled>Preview soon <ArrowRight size={14} /></button></article>)}</div></section>
      <section className="pay-safety"><ShieldCheck size={25} /><div><strong>Money movement needs production infrastructure</strong><p>Before launch we’ll add a regulated payment partner, verified identities, consent screens, signed webhooks, fraud controls, refunds, and store-compliant disclosures. Fairshare will never mark a transfer complete until the provider confirms it.</p></div></section>
      <section className="pay-roadmap"><h2>Preview roadmap</h2><div><article><span>01</span><strong>Record</strong><p>One-tap lending and voice-created drafts.</p></article><article><span>02</span><strong>Connect</strong><p>Wallet, UPI, debit, and credit payment providers.</p></article><article><span>03</span><strong>Confirm</strong><p>Automatic settlement after verified payment.</p></article><article><span>04</span><strong>Expand</strong><p>Receipt intelligence and recurring transfers.</p></article></div></section>
    </div></main>
  )
}
