import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, CheckCircle2, Plus, Receipt, Trash2, X } from 'lucide-react'
import type { UpcomingBill } from '../domain/types'
import { formatMoney } from '../domain/money'
import { api } from '../lib/api'
import { localDateValue } from '../lib/dates'
import { recordRum } from '../lib/rum'

const BILLS_STORAGE_KEY = 'fairshare-bills-v1'

function readSavedBills(): UpcomingBill[] {
  try {
    return JSON.parse(localStorage.getItem(BILLS_STORAGE_KEY) ?? '[]') as UpcomingBill[]
  } catch {
    return []
  }
}

function persistBills(bills: UpcomingBill[]) {
  localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills))
}

export function UpcomingBillsPanel({ currency = 'INR' }: { currency?: string }) {
  const [bills, setBills] = useState<UpcomingBill[]>(readSavedBills)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurrence, setRecurrence] = useState<UpcomingBill['recurrence']>('monthly')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.bills.list()
      .then((remote) => {
        if (!active) return
        const next = remote ?? []
        setBills(next)
        persistBills(next)
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const pendingCount = useMemo(() => bills.filter((bill) => bill.status !== 'paid').length, [bills])

  async function createBill(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const amountMinor = Math.round(Number(amount) * 100)
    if (description.trim().length < 2) return setError('Add a short bill description.')
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError('Enter a valid amount.')
    if (!dueDate) return setError('Choose the next due date.')

    const draft: UpcomingBill = {
      id: crypto.randomUUID(),
      description: description.trim(),
      currency,
      amountMinor,
      dueDate,
      recurrence,
      status: dueDate < localDateValue() ? 'overdue' : 'pending',
      assignedUserIds: [],
      createdAt: new Date().toISOString(),
    }
    let saved = draft
    try {
      saved = await api.bills.create(draft)
    } catch {
      // Offline bills remain usable on this device and sync can be added later.
    }
    const next = [saved, ...bills.filter((bill) => bill.id !== saved.id)]
    setBills(next)
    persistBills(next)
    setDescription('')
    setAmount('')
    setDueDate('')
    setShowForm(false)
    recordRum('bill_created', '/expenses')
  }

  async function markPaid(id: string) {
    try {
      await api.bills.markPaid(id)
    } catch {
      // The local state still reflects the user's action while offline.
    }
    const next = bills.map((bill) => bill.id === id ? { ...bill, status: 'paid' as const } : bill)
    setBills(next)
    persistBills(next)
  }

  async function removeBill(id: string) {
    if (!window.confirm('Delete this upcoming bill?')) return
    try {
      await api.bills.delete(id)
    } catch {
      // Remove the locally stored item even when the backend is unavailable.
    }
    const next = bills.filter((bill) => bill.id !== id)
    setBills(next)
    persistBills(next)
  }

  return (
    <section className="bills-panel" aria-labelledby="upcoming-bills-title">
      <header className="bills-panel__header">
        <div className="bills-panel__title">
          <span><CalendarClock size={20} /></span>
          <div><small>Expenses</small><h2 id="upcoming-bills-title">Upcoming bills</h2><p>Rent, utilities and recurring payments—kept beside your expense ledger.</p></div>
        </div>
        <div className="bills-panel__actions">
          <i>{pendingCount} upcoming</i>
          <button className="button button--primary" type="button" aria-label={showForm ? 'Close bill form' : 'Add bill'} onClick={() => { setShowForm((open) => !open); setError('') }}>
            {showForm ? <X size={16} /> : <Plus size={16} />}<span>{showForm ? 'Close' : 'Add bill'}</span>
          </button>
        </div>
      </header>

      {showForm && (
        <form className="bill-form" onSubmit={createBill}>
          <label className="field"><span>Bill</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Monthly rent" /></label>
          <label className="field"><span>Amount</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
          <label className="field"><span>Next due date</span><input type="date" min={localDateValue()} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label className="field"><span>Repeats</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as UpcomingBill['recurrence'])}><option value="once">One time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit"><Check size={16} /> Save bill</button>
        </form>
      )}

      {loading && bills.length === 0 ? (
        <p className="bills-panel__loading" role="status">Refreshing upcoming bills…</p>
      ) : bills.length === 0 ? (
        <div className="bills-empty"><Receipt size={22} /><span><strong>No upcoming bills</strong><small>Add rent, subscriptions or utilities when you need them.</small></span></div>
      ) : (
        <div className="bill-list">
          {bills.map((bill) => {
            const overdue = bill.status !== 'paid' && bill.dueDate < localDateValue()
            return (
              <article className={`bill-row${overdue ? ' is-overdue' : ''}${bill.status === 'paid' ? ' is-paid' : ''}`} key={bill.id}>
                <span className="bill-row__date"><strong>{new Date(`${bill.dueDate}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit' })}</strong><small>{new Date(`${bill.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</small></span>
                <span className="bill-row__copy"><strong>{bill.description}</strong><small>{overdue ? 'Overdue' : bill.status === 'paid' ? 'Paid' : `Due ${new Date(`${bill.dueDate}T00:00:00`).toLocaleDateString()}`} · {bill.recurrence}</small></span>
                <strong className="bill-row__amount">{formatMoney(bill.amountMinor, bill.currency || currency)}</strong>
                <span className="bill-row__buttons">
                  {bill.status !== 'paid' && <button className="button button--soft" type="button" onClick={() => void markPaid(bill.id)}><CheckCircle2 size={15} /> Paid</button>}
                  <button className="tiny-icon-button" type="button" onClick={() => void removeBill(bill.id)} aria-label={`Delete ${bill.description}`}><Trash2 size={15} /></button>
                </span>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
