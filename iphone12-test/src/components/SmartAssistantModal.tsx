import { ArrowRight, BellRing, BrainCircuit, ChartNoAxesColumnIncreasing, CheckCircle2, HandCoins, Route, Sparkles, X } from 'lucide-react'
import type { Debt, Group, LedgerState } from '../domain/types'
import { formatMoney } from '../domain/money'
import { findUser, shortName } from '../lib/ledger'
import { buildSmartInsights } from '../lib/smartInsights'

interface SmartAssistantModalProps {
  open: boolean
  state: LedgerState
  group: Group
  onClose: () => void
  onRemind: (debt: Debt) => void
  onSettle: (debt: Debt) => void
}

export function SmartAssistantModal({ open, state, group, onClose, onRemind, onSettle }: SmartAssistantModalProps) {
  if (!open) return null
  const insights = buildSmartInsights(state, group)
  const currency = findUser(state.users, state.currentUserId).defaultCurrency ?? 'INR'
  const incoming = insights.debts.find((debt) => debt.toUserId === state.currentUserId)
  const outgoing = insights.debts.find((debt) => debt.fromUserId === state.currentUserId)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal smart-assistant-modal" role="dialog" aria-modal="true" aria-labelledby="smart-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow"><Sparkles size={12} /> Live group analysis</span><h2 id="smart-title">Fairshare Smart</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="smart-summary">
          <span><BrainCircuit size={25} /></span>
          <div><small>Recommended focus</small><strong>{insights.personalDirection === 'owed' ? `Collect ${formatMoney(insights.personalAmount, currency)}` : insights.personalDirection === 'owing' ? `Settle ${formatMoney(insights.personalAmount, currency)}` : 'Keep the group settled'}</strong><p>Recomputed from every expense and recorded payment in {group.name}.</p></div>
        </div>

        <div className="smart-metrics"><article><Route size={18} /><span><small>Clean settle plan</small><strong>{insights.debts.length} transfer{insights.debts.length === 1 ? '' : 's'}</strong></span></article><article><HandCoins size={18} /><span><small>Total moving</small><strong>{formatMoney(insights.totalOutstanding, currency)}</strong></span></article><article><ChartNoAxesColumnIncreasing size={18} /><span><small>Top category</small><strong>{insights.topCategory?.category ?? 'No spend yet'}</strong></span></article></div>

        <section className="smart-recommendations"><h3>Actionable recommendations</h3>{insights.recommendations.map((recommendation) => <article key={recommendation.id}><span className={`smart-recommendation-icon smart-recommendation-icon--${recommendation.kind}`}>{recommendation.kind === 'remind' ? <BellRing size={18} /> : recommendation.kind === 'settle' ? <HandCoins size={18} /> : recommendation.kind === 'spending' ? <ChartNoAxesColumnIncreasing size={18} /> : <CheckCircle2 size={18} />}</span><div><strong>{recommendation.title}</strong><p>{recommendation.copy}</p></div>{recommendation.kind === 'remind' && incoming && <button onClick={() => onRemind(incoming)}>Prepare reminder <ArrowRight size={14} /></button>}{recommendation.kind === 'settle' && outgoing && <button onClick={() => onSettle(outgoing)}>Prefill payment <ArrowRight size={14} /></button>}</article>)}</section>

        {insights.debts.length > 0 && <section className="smart-plan"><h3>Optimized payment route</h3>{insights.debts.map((debt) => { const from = findUser(state.users, debt.fromUserId); const to = findUser(state.users, debt.toUserId); return <article key={`${debt.fromUserId}-${debt.toUserId}`}><span>{shortName(from, state.currentUserId)}</span><ArrowRight size={14} /><span>{shortName(to, state.currentUserId)}</span><strong>{formatMoney(debt.amount, currency)}</strong>{debt.toUserId === state.currentUserId && <button onClick={() => onRemind(debt)}>Remind</button>}</article> })}</section>}
        <p className="helper-copy">Smart recommendations are generated locally from your ledger. No expense details are sent to an AI provider.</p>
      </section>
    </div>
  )
}
