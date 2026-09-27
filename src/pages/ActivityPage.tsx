import { Activity, BellRing, Calculator, Filter, Receipt, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Expense, LedgerState, Payment } from '../domain/types'
import { ExpenseRow, PaymentRow } from '../components/LedgerRows'
import { formatMoney } from '../domain/money'

type ActivityFilter = 'all' | 'expenses' | 'payments'

export function ActivityPage({
  state,
  query,
  onOpenExpense,
  onOpenPayment,
  onOpenNotificationSettings,
  topbar,
}: {
  state: LedgerState
  query: string
  onOpenExpense: (expense: Expense) => void
  onOpenPayment: (payment: Payment) => void
  onOpenNotificationSettings: () => void
  topbar: ReactNode
}) {
  const [filter, setFilter] = useState<ActivityFilter>('all')

  const entries = [
    ...state.expenses.map((data) => ({ kind: 'expense' as const, date: data.occurredAt, createdAt: data.createdAt, data })),
    ...state.payments.map((data) => ({ kind: 'payment' as const, date: data.occurredAt, createdAt: data.createdAt, data })),
  ]
    .filter((entry) => filter === 'all' || (filter === 'expenses' ? entry.kind === 'expense' : entry.kind === 'payment'))
    .filter((entry) => !query.trim() || (entry.kind === 'expense' ? entry.data.description : entry.data.note ?? 'payment').toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Calculate grand totals across all listed transactions
  const totalExpenseAmount = entries
    .filter((e) => e.kind === 'expense')
    .reduce((sum, e) => sum + (e.data as Expense).amount, 0)

  const yourTotalShare = entries
    .filter((e) => e.kind === 'expense')
    .reduce((sum, e) => {
      const exp = e.data as Expense
      const share = exp.shares.find((s) => s.userId === state.currentUserId)
      return sum + (share ? share.amount : 0)
    }, 0)

  const totalPaymentsAmount = entries
    .filter((e) => e.kind === 'payment')
    .reduce((sum, e) => sum + (e.data as Payment).amount, 0)

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content">
        <section className="page-hero">
          <div>
            <span className="page-hero__icon"><Activity size={23} /></span>
            <div>
              <span className="eyebrow">Unified Expense Tracker</span>
              <h1>All Expenses & Settlements</h1>
              <p>View individual and group expenses in one unified list with end-of-list total calculation.</p>
            </div>
          </div>
          <button className="button button--secondary" onClick={onOpenNotificationSettings}>
            <BellRing size={17} /> Notification settings
          </button>
        </section>

        <div className="activity-toolbar">
          <div className="segmented-control compact-tabs" aria-label="Activity filter">
            {(['all', 'expenses', 'payments'] as ActivityFilter[]).map((value) => (
              <button
                key={value}
                className={filter === value ? 'is-active' : ''}
                onClick={() => setFilter(value)}
              >
                {value[0]?.toUpperCase()}{value.slice(1)}
              </button>
            ))}
          </div>
          <span><Filter size={14} /> {entries.length} entries</span>
        </div>

        <section className="activity-feed">
          {entries.length === 0 && (
            <div className="no-results">
              <Search size={26} />
              <strong>No activity found</strong>
              <span>Try a different filter or search query.</span>
            </div>
          )}

          {entries.map((entry) => (
            <div className="activity-feed__entry" key={`${entry.kind}-${entry.data.id}`}>
              <span className="activity-feed__group">
                {state.groups.find((group) => group.id === entry.data.groupId)?.name ?? 'Individual expense'}
              </span>
              {entry.kind === 'expense' ? (
                <ExpenseRow
                  expense={entry.data as Expense}
                  users={state.users}
                  currentUserId={state.currentUserId}
                  onOpen={onOpenExpense}
                />
              ) : (
                <PaymentRow
                  payment={entry.data as Payment}
                  users={state.users}
                  currentUserId={state.currentUserId}
                  onOpen={onOpenPayment}
                />
              )}
            </div>
          ))}

          {entries.length > 0 && (
            <div className="balance-hero-card" style={{ marginTop: '2rem', background: 'var(--surface-sunken, rgba(0,0,0,0.03))' }}>
              <span className="balance-hero-card__label">
                <Calculator size={16} /> Total Calculation ({entries.length} transactions)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
                <div>
                  <small style={{ display: 'block', color: 'var(--ink-subtle)' }}>Total Gross Expenses</small>
                  <strong style={{ fontSize: '1.25rem' }}>{formatMoney(totalExpenseAmount, 'INR')}</strong>
                </div>
                <div>
                  <small style={{ display: 'block', color: 'var(--ink-subtle)' }}>Your Personal Share</small>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--forest)' }}>{formatMoney(yourTotalShare, 'INR')}</strong>
                </div>
                {totalPaymentsAmount > 0 && (
                  <div>
                    <small style={{ display: 'block', color: 'var(--ink-subtle)' }}>Settlements Recorded</small>
                    <strong style={{ fontSize: '1.25rem' }}>{formatMoney(totalPaymentsAmount, 'INR')}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
