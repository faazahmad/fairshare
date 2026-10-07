import { Activity, BellRing, Calculator, Filter, Search } from 'lucide-react'
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
        <section className="page-hero activity-hero">
          <div>
            <span className="page-hero__icon"><Activity size={23} /></span>
            <div>
              <span className="eyebrow">Activity</span>
              <h1>Expenses & settlements</h1>
              <p>Group and direct splits, in one clear timeline.</p>
            </div>
          </div>
          <button className="button button--secondary activity-settings-button" onClick={onOpenNotificationSettings} aria-label="Notification settings">
            <BellRing size={17} /> Settings
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
            <div className="activity-totals">
              <span className="balance-hero-card__label">
                <Calculator size={16} /> Total Calculation ({entries.length} transactions)
              </span>
              <div>
                <div>
                  <small>Total expenses</small>
                  <strong>{formatMoney(totalExpenseAmount, 'INR')}</strong>
                </div>
                <div>
                  <small>Your share</small>
                  <strong className="positive">{formatMoney(yourTotalShare, 'INR')}</strong>
                </div>
                {totalPaymentsAmount > 0 && (
                  <div>
                    <small>Settled</small>
                    <strong>{formatMoney(totalPaymentsAmount, 'INR')}</strong>
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
