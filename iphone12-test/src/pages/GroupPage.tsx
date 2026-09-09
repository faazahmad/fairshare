import type { ReactNode } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BellRing, CircleDollarSign, HandCoins, MoreHorizontal, Plus, Search, Sparkles } from 'lucide-react'
import type { Debt, Expense, Group, LedgerState, Payment } from '../domain/types'
import { calculateBalances, formatMoney, simplifyDebts } from '../domain/money'
import { findUser, shortName } from '../lib/ledger'
import { Avatar } from '../components/Avatar'
import { ExpenseRow, PaymentRow } from '../components/LedgerRows'

interface GroupPageProps {
  state: LedgerState
  group: Group
  query: string
  onAddExpense: () => void
  onSettle: () => void
  onManageGroup: () => void
  onOpenExpense: (expense: Expense) => void
  onOpenPayment: (payment: Payment) => void
  onRemind: (debt: Debt) => void
  onOpenSmart: () => void
  topbar: ReactNode
}

export function GroupPage({ state, group, query, onAddExpense, onSettle, onManageGroup, onOpenExpense, onOpenPayment, onRemind, onOpenSmart, topbar }: GroupPageProps) {
  const groupExpenses = state.expenses.filter((entry) => entry.groupId === group.id)
  const groupPayments = state.payments.filter((entry) => entry.groupId === group.id)
  const currentUser = findUser(state.users, state.currentUserId)
  const currency = currentUser.defaultCurrency ?? 'INR'
  const balances = calculateBalances(group.memberIds, groupExpenses, groupPayments, currency)
  const debts = simplifyDebts(balances)
  const remindableDebt = debts.find((debt) => debt.toUserId === state.currentUserId)
  const currentBalance = balances[state.currentUserId] ?? 0
  const totalSpend = groupExpenses.reduce((sum, entry) => sum + entry.amount, 0)
  const currentUserSpend = groupExpenses.reduce((sum, entry) => sum + (entry.shares.find((share) => share.userId === state.currentUserId)?.amount ?? 0), 0)
  const timeline = [
    ...groupExpenses.map((data) => ({ kind: 'expense' as const, date: data.occurredAt, createdAt: data.createdAt, data })),
    ...groupPayments.map((data) => ({ kind: 'payment' as const, date: data.occurredAt, createdAt: data.createdAt, data })),
  ].filter((entry) => {
    if (!query.trim()) return true
    const searchable = entry.kind === 'expense' ? `${entry.data.description} ${entry.data.category} ${entry.data.notes ?? ''}` : `${entry.data.note ?? ''} payment settlement`
    return searchable.toLowerCase().includes(query.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  return (
    <>
      <main className="main-panel" id="top">
        {topbar}
        <div className="content">
          <section className="group-hero">
            <div className="group-hero__title"><span className="hero-emoji">{group.emoji}</span><div><span className="eyebrow">{group.kind} group · {group.memberIds.length} members</span><h1>{group.name}</h1></div></div>
            <div className="hero-actions"><button className="button button--secondary" onClick={onSettle}><HandCoins size={18} /> Settle up</button><button className="button button--primary" onClick={onAddExpense}><Plus size={18} /> Add expense</button><button className="icon-button group-manage-button" onClick={onManageGroup} aria-label="Edit or delete group"><MoreHorizontal size={20} /></button></div>
          </section>

          <section className="summary-grid" aria-label="Group summary">
            <article className={`summary-card summary-card--balance ${currentBalance >= 0 ? 'positive-card' : 'negative-card'}`}><span className="summary-card__icon">{currentBalance >= 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span><div><small>Your balance</small><strong>{currentBalance === 0 ? 'All settled' : formatMoney(Math.abs(currentBalance), currency)}</strong><span>{currentBalance > 0 ? 'you get back' : currentBalance < 0 ? 'you owe' : 'nothing outstanding'}</span></div></article>
            <article className="summary-card"><span className="summary-card__icon neutral"><CircleDollarSign size={20} /></span><div><small>Total group spend</small><strong>{formatMoney(totalSpend, currency)}</strong><span>{groupExpenses.length} shared expenses</span></div></article>
            <article className="summary-card"><span className="summary-card__icon violet"><Sparkles size={20} /></span><div><small>Your share</small><strong>{formatMoney(currentUserSpend, currency)}</strong><span>{totalSpend ? Math.round((currentUserSpend / totalSpend) * 100) : 0}% of group spend</span></div></article>
          </section>

          <button className="mobile-smart-card" type="button" onClick={onOpenSmart}>
            <span className="mobile-smart-card__icon"><Sparkles size={21} /></span>
            <span className="mobile-smart-card__copy"><small>Fairshare Smart</small><strong>{debts.length === 0 ? 'This group is settled' : `${debts.length} optimized transfer${debts.length === 1 ? '' : 's'} ready`}</strong><span>Open live expense insights and settlement actions</span></span>
            <ArrowRight size={18} />
          </button>
          <div className="mobile-group-actions">
            <button type="button" disabled={!remindableDebt} onClick={() => remindableDebt && onRemind(remindableDebt)}><BellRing size={18} /><span><strong>{remindableDebt ? 'Send a reminder' : 'No reminder needed'}</strong><small>{remindableDebt ? 'WhatsApp or Instagram' : 'Nobody currently owes you'}</small></span></button>
            <button type="button" onClick={onSettle}><HandCoins size={18} /><span><strong>Record payment</strong><small>Then share the update</small></span></button>
          </div>

          <section className="ledger-section">
            <div className="section-heading"><div><h2>Group ledger</h2><p>Tap any expense to see its complete split</p></div>{query && <span className="filter-chip">Showing results for “{query}”</span>}</div>
            <div className="transaction-list">
              {timeline.length === 0 && <div className="no-results"><Search size={26} /><strong>No matching entries</strong><span>Try another search phrase.</span></div>}
              {timeline.map((entry) => entry.kind === 'expense'
                ? <ExpenseRow key={entry.data.id} expense={entry.data} users={state.users} currentUserId={state.currentUserId} onOpen={onOpenExpense} />
                : <PaymentRow key={entry.data.id} payment={entry.data} users={state.users} currentUserId={state.currentUserId} onOpen={onOpenPayment} />)}
            </div>
          </section>
        </div>
      </main>

      <aside className="details-panel">
        <section className="details-section">
          <div className="section-heading section-heading--small"><div><h2>Settle plan</h2><p>Optimized for fewer transfers</p></div><button className="smart-pill" onClick={onOpenSmart}><Sparkles size={12} /> Smart</button></div>
          <div className="debt-list">
            {debts.length === 0 && <div className="settled-card">✓ Everyone is settled up</div>}
            {debts.map((debt) => {
              const from = findUser(state.users, debt.fromUserId)
              const to = findUser(state.users, debt.toUserId)
              return <article key={`${debt.fromUserId}-${debt.toUserId}`}><div className="avatar-stack"><Avatar user={from} size="small" /><Avatar user={to} size="small" /></div><div><strong>{shortName(from, state.currentUserId)} → {shortName(to, state.currentUserId)}</strong><span>{formatMoney(debt.amount, currency)}</span></div>{debt.toUserId === state.currentUserId && <button className="debt-remind" onClick={() => onRemind(debt)}>Remind</button>}</article>
            })}
          </div>
          <button className="button button--wide button--soft" onClick={onSettle}>Record a payment</button>
        </section>
        <section className="details-section">
          <div className="section-heading section-heading--small"><div><h2>Members</h2><p>{group.memberIds.length} people in this group</p></div><button className="tiny-icon-button" aria-label="Add member"><Plus size={16} /></button></div>
          <div className="member-list">{group.memberIds.map((memberId) => { const user = findUser(state.users, memberId); const balance = balances[memberId] ?? 0; return <article key={memberId}><Avatar user={user} /><div><strong>{user.name}{memberId === state.currentUserId ? ' (you)' : ''}</strong><span>{user.email}</span></div><small className={balance >= 0 ? 'positive' : 'negative'}>{balance === 0 ? 'settled' : formatMoney(Math.abs(balance), currency)}</small></article> })}</div>
        </section>
      </aside>
    </>
  )
}
