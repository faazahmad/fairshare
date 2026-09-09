import { Bell, CheckCheck, HandCoins, Receipt, Users } from 'lucide-react'
import type { LedgerState, NotificationPreferences } from '../domain/types'
import { formatMoney } from '../domain/money'
import { findUser } from '../lib/ledger'
import { relativeTimestamp } from '../lib/dates'
import { useMinuteClock } from '../hooks/useMinuteClock'

interface NotificationPanelProps {
  open: boolean
  state: LedgerState
  preferences: NotificationPreferences
  unread: boolean
  onMarkRead: () => void
  onClose: () => void
}

export function NotificationPanel({ open, state, preferences, unread, onMarkRead, onClose }: NotificationPanelProps) {
  const now = useMinuteClock()
  if (!open) return null
  const latestExpenses = preferences.expenseUpdates ? [...state.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2) : []
  const latestPayment = preferences.settlementReminders ? [...state.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined
  const updateCount = latestExpenses.length + (latestPayment ? 1 : 0) + (preferences.groupInvites ? 1 : 0)

  return (
    <div className="notification-panel" role="dialog" aria-label="Notifications">
      <header><div><strong>Notifications</strong><span>{unread && updateCount ? `${updateCount} unread update${updateCount === 1 ? '' : 's'}` : 'You are all caught up'}</span></div><button onClick={onMarkRead}><CheckCheck size={15} /> Mark read</button></header>
      <div className="notification-list">
        {latestExpenses.map((expense) => {
          const author = findUser(state.users, expense.createdBy)
          return <button key={expense.id} onClick={onClose}><span className="notification-icon"><Receipt size={16} /></span><span><strong>{author.name} added “{expense.description}”</strong><small>{formatMoney(expense.amount, expense.currency)} · {relativeTimestamp(expense.createdAt, now)}</small></span><i className={unread ? 'is-unread' : ''} /></button>
        })}
        {latestPayment && <button onClick={onClose}><span className="notification-icon notification-icon--payment"><HandCoins size={16} /></span><span><strong>{findUser(state.users, latestPayment.fromUserId).name} recorded a payment</strong><small>{formatMoney(latestPayment.amount, latestPayment.currency)} · {relativeTimestamp(latestPayment.createdAt, now)}</small></span><i className={unread ? 'is-unread' : ''} /></button>}
        {preferences.groupInvites && <button onClick={onClose}><span className="notification-icon notification-icon--group"><Users size={16} /></span><span><strong>Your groups are up to date</strong><small>No pending invitations</small></span></button>}
        {updateCount === 0 && <div className="notification-empty"><Bell size={18} /><strong>No notification categories enabled</strong><span>Choose what you want to receive in Settings.</span></div>}
      </div>
    </div>
  )
}
