import { Activity, BellRing, Filter, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Expense, LedgerState, Payment } from '../domain/types'
import { ExpenseRow, PaymentRow } from '../components/LedgerRows'

type ActivityFilter = 'all' | 'expenses' | 'payments'

export function ActivityPage({ state, query, onOpenExpense, onOpenPayment, onOpenNotificationSettings, topbar }: { state: LedgerState; query: string; onOpenExpense: (expense: Expense) => void; onOpenPayment: (payment: Payment) => void; onOpenNotificationSettings: () => void; topbar: ReactNode }) {
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const entries = [
    ...state.expenses.map((data) => ({ kind: 'expense' as const, date: data.occurredAt, createdAt: data.createdAt, data })),
    ...state.payments.map((data) => ({ kind: 'payment' as const, date: data.occurredAt, createdAt: data.createdAt, data })),
  ].filter((entry) => filter === 'all' || (filter === 'expenses' ? entry.kind === 'expense' : entry.kind === 'payment'))
    .filter((entry) => !query.trim() || (entry.kind === 'expense' ? entry.data.description : entry.data.note ?? 'payment').toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content">
        <section className="page-hero"><div><span className="page-hero__icon"><Activity size={23} /></span><div><span className="eyebrow">Account history</span><h1>Recent activity</h1><p>Every expense and settlement across your groups.</p></div></div><button className="button button--secondary" onClick={onOpenNotificationSettings}><BellRing size={17} /> Notification settings</button></section>
        <div className="activity-toolbar"><div className="segmented-control compact-tabs" aria-label="Activity filter">{(['all', 'expenses', 'payments'] as ActivityFilter[]).map((value) => <button key={value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value[0]?.toUpperCase()}{value.slice(1)}</button>)}</div><span><Filter size={14} /> {entries.length} entries</span></div>
        <section className="activity-feed">
          {entries.length === 0 && <div className="no-results"><Search size={26} /><strong>No activity found</strong><span>Try a different filter or search.</span></div>}
          {entries.map((entry) => <div className="activity-feed__entry" key={`${entry.kind}-${entry.data.id}`}><span className="activity-feed__group">{state.groups.find((group) => group.id === entry.data.groupId)?.name ?? 'Direct expense'}</span>{entry.kind === 'expense' ? <ExpenseRow expense={entry.data} users={state.users} currentUserId={state.currentUserId} onOpen={onOpenExpense} /> : <PaymentRow payment={entry.data} users={state.users} currentUserId={state.currentUserId} onOpen={onOpenPayment} />}</div>)}
        </section>
      </div>
    </main>
  )
}
