import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Pencil, ReceiptText, Trash2, X } from 'lucide-react'
import type { Expense, Group, User } from '../domain/types'
import { formatMoney } from '../domain/money'
import { formatDateOnly } from '../lib/dates'
import { categoryEmoji, findUser } from '../lib/ledger'
import { Avatar } from './Avatar'

interface ExpenseDetailModalProps {
  expense: Expense | null
  group?: Group
  users: User[]
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expenseId: string) => void
  requireDeleteConfirmation?: boolean
}

export function ExpenseDetailModal({ expense, group, users, onClose, onEdit, onDelete, requireDeleteConfirmation = true }: ExpenseDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => { setConfirmDelete(false) }, [expense?.id])
  if (!expense) return null
  const payer = findUser(users, expense.payers[0]?.userId ?? expense.createdBy)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal expense-detail-modal" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div><span className="eyebrow">{group?.emoji} {group?.name ?? 'Shared expense'}</span><h2 id="expense-detail-title">Expense details</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="detail-amount-card">
          <span className="detail-amount-card__icon">{categoryEmoji[expense.category] ?? '🧾'}</span>
          <div><span>{expense.category}</span><h3>{expense.description}</h3><strong>{formatMoney(expense.amount, expense.currency)}</strong></div>
        </div>

        <div className="detail-meta">
          <span><CalendarDays size={15} /> {formatDateOnly(expense.occurredAt, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span><ReceiptText size={15} /> Added by {findUser(users, expense.createdBy).name}</span>
        </div>

        <section className="paid-summary"><Avatar user={payer} /><div><span>Paid by</span><strong>{payer.name}</strong></div><strong>{formatMoney(expense.payers[0]?.amount ?? 0, expense.currency)}</strong></section>

        <section className="split-breakdown">
          <h3>Split breakdown</h3>
          {expense.shares.map((share) => {
            const user = findUser(users, share.userId)
            return <article key={user.id}><Avatar user={user} size="small" /><span>{user.name}</span><strong>{formatMoney(share.amount, expense.currency)}</strong></article>
          })}
        </section>

        {expense.notes && <blockquote>{expense.notes}</blockquote>}
        {confirmDelete ? (
          <div className="delete-confirmation"><AlertTriangle size={18} /><div><strong>Delete this expense?</strong><span>Balances will recalculate immediately. This cannot be undone.</span></div><button className="button button--ghost" onClick={() => setConfirmDelete(false)}>Keep it</button><button className="button button--danger" onClick={() => { onDelete(expense.id); onClose() }}>Delete</button></div>
        ) : (
          <div className="detail-actions"><button className="button button--danger-ghost" onClick={() => { if (requireDeleteConfirmation) setConfirmDelete(true); else { onDelete(expense.id); onClose() } }}><Trash2 size={16} /> Delete</button><button className="button button--secondary" onClick={() => onEdit(expense)}><Pencil size={16} /> Edit all details</button></div>
        )}
      </section>
    </div>
  )
}
