import { HandCoins, MoreHorizontal } from 'lucide-react'
import type { Expense, Payment, User } from '../domain/types'
import { formatMoney } from '../domain/money'
import { formatDateOnly } from '../lib/dates'
import { categoryEmoji, expenseUserNet, findUser, shortName } from '../lib/ledger'

export function ExpenseRow({ expense, users, currentUserId, onOpen }: { expense: Expense; users: User[]; currentUserId: string; onOpen?: (expense: Expense) => void }) {
  const payer = findUser(users, expense.payers[0]?.userId ?? expense.createdBy)
  const net = expenseUserNet(expense, currentUserId)
  const owed = expense.shares.find((entry) => entry.userId === currentUserId)?.amount ?? 0

  return (
    <article className={`transaction-row ${onOpen ? 'transaction-row--interactive' : ''}`} onClick={() => onOpen?.(expense)} onKeyDown={(event) => event.key === 'Enter' && onOpen?.(expense)} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      <time className="date-tile" dateTime={expense.occurredAt}><span>{formatDateOnly(expense.occurredAt, { month: 'short' })}</span><strong>{formatDateOnly(expense.occurredAt, { day: 'numeric' })}</strong></time>
      <span className="category-icon">{categoryEmoji[expense.category] ?? '🧾'}</span>
      <div className="transaction-copy">
        <strong>{expense.description}</strong>
        <span>{shortName(payer, currentUserId)} paid {formatMoney(expense.amount, expense.currency)} · {expense.category}</span>
      </div>
      <div className="transaction-total"><small>Total</small><strong>{formatMoney(expense.amount, expense.currency)}</strong></div>
      <div className={`transaction-impact ${net >= 0 ? 'positive' : 'negative'}`}>
        <small>{net > 0 ? 'you lent' : net < 0 ? 'your share' : 'not involved'}</small>
        <strong>{formatMoney(Math.abs(net || owed), expense.currency)}</strong>
      </div>
      <button className="tiny-icon-button" aria-label={`More options for ${expense.description}`} onClick={(event) => { event.stopPropagation(); onOpen?.(expense) }}><MoreHorizontal size={18} /></button>
    </article>
  )
}

export function PaymentRow({ payment, users, currentUserId, onOpen }: { payment: Payment; users: User[]; currentUserId: string; onOpen?: (payment: Payment) => void }) {
  const payer = findUser(users, payment.fromUserId)
  const recipient = findUser(users, payment.toUserId)
  const affectsUser = payer.id === currentUserId || recipient.id === currentUserId
  return (
    <article className={`transaction-row transaction-row--payment ${onOpen ? 'transaction-row--interactive' : ''}`} onClick={() => onOpen?.(payment)} onKeyDown={(event) => event.key === 'Enter' && onOpen?.(payment)} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      <time className="date-tile" dateTime={payment.occurredAt}><span>{formatDateOnly(payment.occurredAt, { month: 'short' })}</span><strong>{formatDateOnly(payment.occurredAt, { day: 'numeric' })}</strong></time>
      <span className="category-icon category-icon--payment"><HandCoins size={21} /></span>
      <div className="transaction-copy"><strong>Payment recorded</strong><span>{shortName(payer, currentUserId)} paid {shortName(recipient, currentUserId)} · {payment.note ?? 'External payment'}</span></div>
      <div className="transaction-total"><small>Payment</small><strong>{formatMoney(payment.amount, payment.currency)}</strong></div>
      <div className={`transaction-impact ${affectsUser ? 'positive' : ''}`}><small>{affectsUser ? 'balance updated' : 'group payment'}</small><strong>{affectsUser ? 'Recorded' : '—'}</strong></div>
      <button className="tiny-icon-button" aria-label="More payment options" onClick={(event) => { event.stopPropagation(); onOpen?.(payment) }}><MoreHorizontal size={18} /></button>
    </article>
  )
}
