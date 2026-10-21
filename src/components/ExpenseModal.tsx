import { useEffect, useMemo, useState } from 'react'
import { BellRing, CalendarDays, Check, ReceiptText, X } from 'lucide-react'
import type { Expense, Group, NotificationChannel, SplitMode, User } from '../domain/types'
import {
  currencySymbol, parseMoney,
  splitByPercentages,
  splitByShares,
  splitEqually,
  validateExactSplit,
} from '../domain/money'
import { localDateValue } from '../lib/dates'
import { api } from '../lib/api'
import { Avatar } from './Avatar'
import { ReminderChannelPicker } from './ReminderChannelPicker'

interface ExpenseModalProps {
  open: boolean
  expense?: Expense | null
  group: Group
  users: User[]
  currentUserId: string
  currency: string
  onClose: () => void
  onSave: (expense: Expense) => void
}

const splitLabels: Record<SplitMode, string> = {
  equal: 'Equally',
  exact: 'Exact',
  percentage: 'Percent',
  shares: 'Shares',
}

export function ExpenseModal({
  open,
  expense,
  group,
  users,
  currentUserId,
  currency,
  onClose,
  onSave,
}: ExpenseModalProps) {
  const groupUsers = useMemo(
    () => group.memberIds.map((id) => users.find((user) => user.id === id)).filter(Boolean) as User[],
    [group.memberIds, users],
  )
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState(currentUserId)
  const [date, setDate] = useState(localDateValue())
  const [category, setCategory] = useState('General')
  const [notes, setNotes] = useState('')
  const [reminderDays, setReminderDays] = useState<'' | '7' | '10' | '15' | '30'>('')
  const [reminderChannels, setReminderChannels] = useState<NotificationChannel[]>(['whatsapp'])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [selectedIds, setSelectedIds] = useState<string[]>(group.memberIds)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDescription(expense?.description ?? '')
    setAmount(expense ? (expense.amount / 100).toFixed(2) : '')
    setPayerId(expense?.payers[0]?.userId ?? currentUserId)
    setDate(expense?.occurredAt ?? localDateValue())
    setCategory(expense?.category ?? 'General')
    setNotes(expense?.notes ?? '')
    setReminderDays(expense?.reminderScheduleDays ? String(expense.reminderScheduleDays) as typeof reminderDays : '')
    setReminderChannels(expense?.reminderChannels?.length ? expense.reminderChannels : ['whatsapp'])
    setSplitMode(expense ? 'exact' : 'equal')
    setSelectedIds(expense ? expense.shares.map((share) => share.userId) : group.memberIds)
    setCustomValues(expense
      ? Object.fromEntries(expense.shares.map((share) => [share.userId, (share.amount / 100).toFixed(2)]))
      : Object.fromEntries(group.memberIds.map((id) => [id, '1'])))
    setError('')
  }, [open, expense, group.id, group.memberIds, currentUserId])

  if (!open) return null

  function selectMode(mode: SplitMode) {
    setSplitMode(mode)
    setError('')
    if (mode === 'shares') {
      setCustomValues(Object.fromEntries(selectedIds.map((id) => [id, '1'])))
    } else if (mode === 'percentage') {
      const each = selectedIds.length > 0 ? 100 / selectedIds.length : 0
      setCustomValues(Object.fromEntries(selectedIds.map((id) => [id, String(each)])))
    } else if (mode === 'exact') {
      const parsedAmount = parseMoney(amount)
      const equal = parsedAmount ? splitEqually(parsedAmount, selectedIds) : []
      setCustomValues(Object.fromEntries(equal.map((entry) => [entry.userId, (entry.amount / 100).toFixed(2)])))
    }
  }

  function toggleParticipant(userId: string) {
    setSelectedIds((current) => {
      if (current.includes(userId)) {
        return current.length === 1 ? current : current.filter((id) => id !== userId)
      }
      return [...current, userId]
    })
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const total = parseMoney(amount)
    if (!description.trim()) return setError('Add a short description.')
    if (!total) return setError('Enter a valid amount with no more than two decimals.')
    if (selectedIds.length === 0) return setError('Select at least one participant.')

    try {
      let shares
      if (splitMode === 'equal') {
        shares = splitEqually(total, selectedIds)
      } else if (splitMode === 'shares') {
        shares = splitByShares(
          total,
          selectedIds.map((userId) => ({ userId, shares: Number(customValues[userId] ?? 0) })),
        )
      } else if (splitMode === 'percentage') {
        shares = splitByPercentages(
          total,
          selectedIds.map((userId) => ({ userId, percentage: Number(customValues[userId] ?? 0) })),
        )
      } else {
        shares = validateExactSplit(
          total,
          selectedIds.map((userId) => {
            const rawValue = customValues[userId] ?? ''
            const parsed = rawValue.trim() === '0' ? 0 : parseMoney(rawValue)
            if (parsed === null) throw new Error('Every exact amount must be valid.')
            return { userId, amount: parsed }
          }),
        )
      }

      const timestamp = new Date().toISOString()
      const expenseId = expense?.id ?? crypto.randomUUID()
      const nextExpense: Expense = {
        id: expenseId,
        groupId: expense?.groupId ?? group.id,
        description: description.trim(),
        notes: notes.trim() || undefined,
        category,
        currency: expense?.currency ?? currency,
        amount: total,
        occurredAt: date,
        createdAt: expense?.createdAt ?? timestamp,
        createdBy: expense?.createdBy ?? currentUserId,
        payers: [{ userId: payerId, amount: total }],
        shares,
        reminderScheduleDays: reminderDays ? Number(reminderDays) as 7 | 10 | 15 | 30 : undefined,
        reminderPayerIds: reminderDays ? selectedIds.filter((id) => id !== payerId) : undefined,
        reminderChannels: reminderDays ? reminderChannels : undefined,
      }
      onSave(nextExpense)
      if (reminderDays) {
        void Promise.allSettled(selectedIds.filter((id) => id !== payerId).map((userId) => {
          const payer = users.find((user) => user.id === userId)
          return api.reminders.create({ sourceType: 'expense', sourceId: expenseId, expenseDescription: nextExpense.description,
            currency: nextExpense.currency, amountMinor: shares.find((share) => share.userId === userId)?.amount ?? total,
            payerUserId: userId, payerName: payer?.name, payerMsisdn: payer?.phone,
            channels: reminderChannels,
            intervalDays: Number(reminderDays) as 7 | 10 | 15 | 30 })
        }))
      }
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create this expense.')
    }
  }

  const suffix = splitMode === 'percentage' ? '%' : splitMode === 'shares' ? '×' : currencySymbol(expense?.currency ?? currency)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal form-modal expense-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <span className="eyebrow">{group.emoji} {group.name}</span>
            <h2 id="expense-title">{expense ? 'Edit expense' : 'Add an expense'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="modal__scroll">
          <div className="expense-primary-fields">
            <span className="receipt-mark"><ReceiptText size={28} /></span>
            <label>
              <span className="sr-only">Description</span>
              <input
                className="line-input line-input--description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What was it for?"
                autoFocus
              />
            </label>
            <label className="amount-field">
              <span className="currency-symbol" aria-hidden="true">{currencySymbol(expense?.currency ?? currency)}</span>
              <span className="sr-only">Amount</span>
              <input
                className="line-input line-input--amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="paid-by-row">
            <span>Paid by</span>
            <select value={payerId} onChange={(event) => setPayerId(event.target.value)}>
              {groupUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <span>and split</span>
          </div>

          <div className="segmented-control" aria-label="Split method">
            {(Object.keys(splitLabels) as SplitMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={splitMode === mode ? 'is-active' : ''}
                onClick={() => selectMode(mode)}
              >
                {splitLabels[mode]}
              </button>
            ))}
          </div>

          <div className="participant-list">
            {groupUsers.map((user) => {
              const selected = selectedIds.includes(user.id)
              return (
                <div className={`participant ${selected ? '' : 'participant--muted'}`} key={user.id}>
                  <button
                    className={`participant__toggle ${selected ? 'is-selected' : ''}`}
                    type="button"
                    onClick={() => toggleParticipant(user.id)}
                    aria-label={`${selected ? 'Remove' : 'Add'} ${user.name}`}
                  >
                    {selected && <Check size={14} />}
                  </button>
                  <Avatar user={user} size="small" />
                  <span className="participant__name">{user.name}{user.id === currentUserId ? ' (you)' : ''}</span>
                  {splitMode !== 'equal' && selected && (
                    <label className="participant__value">
                      <span>{suffix}</span>
                      <input
                        inputMode="decimal"
                        value={customValues[user.id] ?? ''}
                        onChange={(event) => setCustomValues((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))}
                        aria-label={`${splitLabels[splitMode]} value for ${user.name}`}
                      />
                    </label>
                  )}
                </div>
              )
            })}
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Date</span>
              <span className="input-with-icon"><CalendarDays size={16} /><input type="date" value={date} max={localDateValue()} onChange={(event) => setDate(event.target.value)} /></span>
            </label>
            <label className="field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {['General', 'Dining', 'Stay', 'Transport', 'Groceries', 'Rent', 'Entertainment', 'Sports'].map((value) => (
                  <option value={value} key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Notes <small>optional</small></span>
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context for the group" />
          </label>
          <section className="reminder-setup"><span className="reminder-setup__icon"><BellRing size={17} /></span><div><strong>Automatic payment reminders</strong><p>Send a private server-side reminder to everyone who owes the payer until settled.</p></div><label><span className="sr-only">Reminder schedule</span><select value={reminderDays} onChange={(event) => setReminderDays(event.target.value as typeof reminderDays)}><option value="">Off</option><option value="7">Every 7 days</option><option value="10">Every 10 days</option><option value="15">Every 15 days</option><option value="30">Every 30 days</option></select></label></section>
          {reminderDays && <ReminderChannelPicker channels={reminderChannels} onChange={setReminderChannels} />}

          {error && <p className="form-error" role="alert">{error}</p>}
          </div>

          <footer className="modal__footer">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit">{expense ? 'Save changes' : 'Save expense'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
