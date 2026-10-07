import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, HandCoins, X } from 'lucide-react'
import type { Debt, Group, Payment, User } from '../domain/types'
import { currencySymbol, parseMoney } from '../domain/money'
import { localDateValue } from '../lib/dates'
import { Avatar } from './Avatar'

interface SettleModalProps {
  open: boolean
  payment?: Payment | null
  suggestedDebt?: Debt | null
  group: Group
  users: User[]
  currentUserId: string
  currency: string
  onClose: () => void
  onSave: (payment: Payment) => void
}

export function SettleModal({ open, payment, suggestedDebt, group, users, currentUserId, currency, onClose, onSave }: SettleModalProps) {
  const members = useMemo(
    () => group.memberIds.map((id) => users.find((user) => user.id === id)).filter(Boolean) as User[],
    [group.memberIds, users],
  )
  const firstOther = members.find((user) => user.id !== currentUserId)?.id ?? currentUserId
  const [fromUserId, setFromUserId] = useState(currentUserId)
  const [toUserId, setToUserId] = useState(firstOther)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('UPI / cash payment')
  const [date, setDate] = useState(localDateValue())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFromUserId(payment?.fromUserId ?? suggestedDebt?.fromUserId ?? currentUserId)
    setToUserId(payment?.toUserId ?? suggestedDebt?.toUserId ?? firstOther)
    setAmount(payment ? (payment.amount / 100).toFixed(2) : suggestedDebt ? (suggestedDebt.amount / 100).toFixed(2) : '')
    setNote(payment?.note ?? 'UPI / cash payment')
    setDate(payment?.occurredAt ?? localDateValue())
    setError('')
  }, [open, payment, suggestedDebt, currentUserId, firstOther])

  if (!open) return null

  const fromUser = members.find((user) => user.id === fromUserId) ?? members[0]
  const toUser = members.find((user) => user.id === toUserId) ?? members[1] ?? members[0]

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = parseMoney(amount)
    if (!parsed) return setError('Enter a valid settlement amount.')
    if (fromUserId === toUserId) return setError('Payer and recipient must be different people.')
    onSave({
      id: payment?.id ?? crypto.randomUUID(),
      groupId: payment?.groupId ?? group.id,
      currency: payment?.currency ?? currency,
      amount: parsed,
      fromUserId,
      toUserId,
      occurredAt: date,
      createdAt: payment?.createdAt ?? new Date().toISOString(),
      note: note.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal settle-modal" role="dialog" aria-modal="true" aria-labelledby="settle-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div>
            <span className="eyebrow">{payment ? 'Update a ledger payment' : 'Record an external payment'}</span>
            <h2 id="settle-title">{payment ? 'Edit payment' : 'Settle up'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="settlement-people">
            <label>
              {fromUser && <Avatar user={fromUser} size="large" />}
              <span>Payer</span>
              <select value={fromUserId} onChange={(event) => setFromUserId(event.target.value)}>
                {members.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            <span className="settlement-arrow"><ArrowRight size={22} /></span>
            <label>
              {toUser && <Avatar user={toUser} size="large" />}
              <span>Recipient</span>
              <select value={toUserId} onChange={(event) => setToUserId(event.target.value)}>
                {members.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
          </div>
          <label className="settlement-amount">
            <HandCoins size={26} />
            <span>{currencySymbol(payment?.currency ?? currency)}</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" autoFocus />
          </label>
          <div className="form-grid">
            <label className="field"><span>Payment date</span><span className="input-with-icon"><CalendarDays size={16} /><input type="date" value={date} max={localDateValue()} onChange={(event) => setDate(event.target.value)} /></span></label>
            <label className="field"><span>Payment note</span><input value={note} onChange={(event) => setNote(event.target.value)} /></label>
          </div>
          <p className="helper-copy">This records a payment in Fairshare. It does not move real money.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal__footer">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit">{payment ? 'Save changes' : 'Record payment'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
