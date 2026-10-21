import { useEffect, useState } from 'react'
import { AlertTriangle, BellRing, CalendarDays, Pencil, ReceiptText, Send, Trash2, X } from 'lucide-react'
import type { Expense, Group, NotificationChannel, PaymentReminder, User } from '../domain/types'
import { formatMoney } from '../domain/money'
import { formatDateOnly } from '../lib/dates'
import { categoryEmoji, findUser } from '../lib/ledger'
import { Avatar } from './Avatar'
import { api } from '../lib/api'
import { ReminderChannelPicker } from './ReminderChannelPicker'

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
  const [reminders, setReminders] = useState<PaymentReminder[]>([])
  const [reminderUserId, setReminderUserId] = useState('')
  const [reminderDays, setReminderDays] = useState<'7' | '10' | '15' | '30'>('7')
  const [reminderChannels, setReminderChannels] = useState<NotificationChannel[]>(['whatsapp'])
  const [reminderNotice, setReminderNotice] = useState('')
  const [reminderError, setReminderError] = useState('')
  useEffect(() => {
    setConfirmDelete(false); setReminderNotice(''); setReminderError('')
    if (!expense) return
    setReminderUserId(expense.shares.find((share) => share.userId !== expense.payers[0]?.userId)?.userId ?? '')
    setReminderChannels(expense.reminderChannels?.length ? expense.reminderChannels : ['whatsapp'])
    api.reminders.list('expense', expense.id).then(setReminders).catch(() => setReminders([]))
  }, [expense?.id])
  if (!expense) return null
  const payer = findUser(users, expense.payers[0]?.userId ?? expense.createdBy)
  const reminderCandidates = expense.shares.map((share) => findUser(users, share.userId)).filter((user) => user.id !== payer.id)

  async function scheduleReminder() {
    setReminderNotice(''); setReminderError('')
    const target = reminderCandidates.find((user) => user.id === reminderUserId)
    const share = expense?.shares.find((entry) => entry.userId === reminderUserId)
    if (!expense || !target || !share) return setReminderError('Choose the payer who should receive reminders.')
    try {
      const saved = await api.reminders.create({ sourceType: 'expense', sourceId: expense.id, expenseDescription: expense.description,
        currency: expense.currency, amountMinor: share.amount, payerUserId: target.id, payerName: target.name, payerMsisdn: target.phone,
        channels: reminderChannels,
        intervalDays: Number(reminderDays) as 7 | 10 | 15 | 30 })
      setReminders((current) => [saved, ...current]); setReminderNotice(`Reminder scheduled for ${target.name} every ${reminderDays} days.`)
    } catch (caught) { setReminderError(caught instanceof Error ? caught.message : 'Could not schedule this reminder.') }
  }

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
        {reminderCandidates.length > 0 && <section className="detail-reminders"><header><span><BellRing size={17} /></span><div><strong>Payment reminders</strong><p>Schedule or review private server-side reminders for this expense.</p></div></header><div className="detail-reminders__controls"><label className="field"><span>Payer</span><select value={reminderUserId} onChange={(event) => setReminderUserId(event.target.value)}>{reminderCandidates.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Repeat</span><select value={reminderDays} onChange={(event) => setReminderDays(event.target.value as typeof reminderDays)}><option value="7">Every 7 days</option><option value="10">Every 10 days</option><option value="15">Every 15 days</option><option value="30">Every 30 days</option></select></label><button className="button button--primary" onClick={() => void scheduleReminder()}><Send size={15} /> Schedule</button></div><ReminderChannelPicker channels={reminderChannels} onChange={setReminderChannels} />{reminders.length > 0 && <div className="detail-reminder-list">{reminders.map((reminder) => <span key={reminder.id}><i className={reminder.status === 'active' ? 'is-active' : ''} /> {reminder.payerName} · every {reminder.intervalDays} days · {reminder.channels?.join(' + ') ?? 'whatsapp'} · {reminder.status}</span>)}</div>}{reminderNotice && <p className="detail-reminders__notice">{reminderNotice}</p>}{reminderError && <p className="form-error">{reminderError}</p>}</section>}
        {confirmDelete ? (
          <div className="delete-confirmation"><AlertTriangle size={18} /><div><strong>Delete this expense?</strong><span>Balances will recalculate immediately. This cannot be undone.</span></div><button className="button button--ghost" onClick={() => setConfirmDelete(false)}>Keep it</button><button className="button button--danger" onClick={() => { onDelete(expense.id); onClose() }}>Delete</button></div>
        ) : (
          <div className="detail-actions"><button className="button button--danger-ghost" onClick={() => { if (requireDeleteConfirmation) setConfirmDelete(true); else { onDelete(expense.id); onClose() } }}><Trash2 size={16} /> Delete</button><button className="button button--secondary" onClick={() => onEdit(expense)}><Pencil size={16} /> Edit all details</button></div>
        )}
      </section>
    </div>
  )
}
