import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, HandCoins, MessageCircle, Pencil, Trash2, X } from 'lucide-react'
import type { Group, Payment, User } from '../domain/types'
import { formatMoney } from '../domain/money'
import { formatDateOnly } from '../lib/dates'
import { findUser } from '../lib/ledger'
import { Avatar } from './Avatar'

interface PaymentDetailModalProps {
  payment: Payment | null
  group?: Group
  users: User[]
  onClose: () => void
  onEdit: (payment: Payment) => void
  onShare: (payment: Payment) => void
  onDelete: (paymentId: string) => void
  requireDeleteConfirmation?: boolean
}

export function PaymentDetailModal({ payment, group, users, onClose, onEdit, onShare, onDelete, requireDeleteConfirmation = true }: PaymentDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => { setConfirmDelete(false) }, [payment?.id])
  if (!payment) return null
  const payer = findUser(users, payment.fromUserId)
  const recipient = findUser(users, payment.toUserId)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal payment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow">{group?.emoji} {group?.name ?? 'Recorded payment'}</span><h2 id="payment-detail-title">Payment details</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="payment-detail-amount"><span><HandCoins size={27} /></span><div><small>Recorded settlement</small><strong>{formatMoney(payment.amount, payment.currency)}</strong><p>{payment.note ?? 'External payment'}</p></div></div>
        <div className="payment-route"><div><Avatar user={payer} size="large" /><span>Payer</span><strong>{payer.name}</strong></div><span><ArrowRight size={21} /></span><div><Avatar user={recipient} size="large" /><span>Recipient</span><strong>{recipient.name}</strong></div></div>
        <p className="payment-detail-date"><CalendarDays size={15} /> {formatDateOnly(payment.occurredAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        {confirmDelete ? <div className="delete-confirmation"><AlertTriangle size={18} /><div><strong>Delete this payment?</strong><span>The previous group balance will be restored immediately.</span></div><button className="button button--ghost" onClick={() => setConfirmDelete(false)}>Keep it</button><button className="button button--danger" onClick={() => { onDelete(payment.id); onClose() }}>Delete</button></div> : <div className="detail-actions payment-detail-actions"><button className="button button--danger-ghost" onClick={() => { if (requireDeleteConfirmation) setConfirmDelete(true); else { onDelete(payment.id); onClose() } }}><Trash2 size={16} /> Delete</button><button className="button button--secondary" onClick={() => onEdit(payment)}><Pencil size={16} /> Edit details</button><button className="button button--primary" onClick={() => onShare(payment)}><MessageCircle size={16} /> Notify person</button></div>}
      </section>
    </div>
  )
}
