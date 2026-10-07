import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, Plus, ReceiptText, Search, UserPlus, Users, X } from 'lucide-react'
import type { Contact, Expense, SplitMode, User } from '../domain/types'
import {
  currencySymbol,
  parseMoney,
  splitByPercentages,
  splitByShares,
  splitEqually,
  validateExactSplit,
} from '../domain/money'
import { api } from '../lib/api'
import { localDateValue } from '../lib/dates'
import {
  DIRECT_SPLIT_GROUP_ID,
  contactAsUser,
  contactParticipantId,
  isValidMsisdn,
  mergeContacts,
  normalizeMsisdn,
  readLocalContacts,
  saveLocalContacts,
} from '../lib/directSplits'
import { Avatar } from './Avatar'

interface DirectExpenseModalProps {
  open: boolean
  expense?: Expense | null
  currentUser: User
  users: User[]
  currency: string
  initialContact?: Contact | null
  onClose: () => void
  onSave: (expense: Expense, people: User[]) => void
}

const splitLabels: Record<SplitMode, string> = {
  equal: 'Equally',
  exact: 'Exact',
  percentage: 'Percent',
  shares: 'Shares',
}

export function DirectExpenseModal({
  open,
  expense,
  currentUser,
  users,
  currency,
  initialContact,
  onClose,
  onSave,
}: DirectExpenseModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactNotice, setContactNotice] = useState('')
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localDateValue())
  const [category, setCategory] = useState('General')
  const [notes, setNotes] = useState('')
  const [payerId, setPayerId] = useState(currentUser.id)
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.id])
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let active = true
    setContactsLoading(true)
    const localContacts = readLocalContacts()
    setContacts(mergeContacts(localContacts, initialContact ? [initialContact] : []))
    api.contacts.list()
      .then((remote) => {
        if (!active) return
        const merged = mergeContacts(remote ?? [], localContacts, initialContact ? [initialContact] : [])
        setContacts(merged)
        saveLocalContacts(merged)
      })
      .catch(() => undefined)
      .finally(() => { if (active) setContactsLoading(false) })
    return () => { active = false }
  }, [open, initialContact?.id])

  useEffect(() => {
    if (!open) return
    setDescription(expense?.description ?? '')
    setAmount(expense ? (expense.amount / 100).toFixed(2) : '')
    setDate(expense?.occurredAt ?? localDateValue())
    setCategory(expense?.category ?? 'General')
    setNotes(expense?.notes ?? '')
    setPayerId(expense?.payers[0]?.userId ?? currentUser.id)
    setSplitMode(expense ? 'exact' : 'equal')
    const initialIds = expense
      ? expense.shares.map((share) => share.userId)
      : [currentUser.id, ...(initialContact ? [contactParticipantId(initialContact)] : [])]
    setSelectedIds(Array.from(new Set(initialIds)))
    setCustomValues(expense
      ? Object.fromEntries(expense.shares.map((share) => [share.userId, (share.amount / 100).toFixed(2)]))
      : {})
    setError('')
    setContactNotice('')
    setQuery('')
    setShowAddContact(false)
  }, [open, expense?.id, currentUser.id, initialContact?.id])

  const contactUsers = useMemo(() => contacts.map(contactAsUser), [contacts])
  const participantUsers = useMemo(() => {
    const merged = new Map<string, User>([[currentUser.id, currentUser]])
    for (const user of [...users, ...contactUsers]) merged.set(user.id, user)
    return Array.from(merged.values())
  }, [contactUsers, currentUser, users])
  const filteredContacts = contacts.filter((contact) => {
    const needle = query.trim().toLowerCase()
    return !needle || contact.name.toLowerCase().includes(needle) || contact.msisdn.includes(needle)
  })

  if (!open) return null

  function selectMode(mode: SplitMode) {
    setSplitMode(mode)
    setError('')
    if (mode === 'shares') setCustomValues(Object.fromEntries(selectedIds.map((id) => [id, '1'])))
    if (mode === 'percentage') {
      const each = selectedIds.length ? 100 / selectedIds.length : 0
      setCustomValues(Object.fromEntries(selectedIds.map((id) => [id, String(each)])))
    }
    if (mode === 'exact') {
      const total = parseMoney(amount)
      const equal = total ? splitEqually(total, selectedIds) : []
      setCustomValues(Object.fromEntries(equal.map((entry) => [entry.userId, (entry.amount / 100).toFixed(2)])))
    }
  }

  function toggleParticipant(userId: string) {
    setSelectedIds((current) => {
      const next = current.includes(userId)
        ? current.length === 1 ? current : current.filter((id) => id !== userId)
        : [...current, userId]
      if (!next.includes(payerId)) setPayerId(next[0] ?? currentUser.id)
      return next
    })
  }

  async function addContact() {
    setError('')
    setContactNotice('')
    const name = contactName.trim()
    const msisdn = normalizeMsisdn(contactPhone)
    if (name.length < 2) return setError('Enter a contact name.')
    if (!isValidMsisdn(msisdn)) return setError('Enter a valid phone number with country code.')

    const localContact: Contact = {
      id: crypto.randomUUID(),
      name,
      msisdn,
      addedAt: new Date().toISOString(),
      isRegisteredUser: false,
    }

    let saved = localContact
    try {
      saved = await api.contacts.add({ name, msisdn })
    } catch {
      // Phone-only contacts remain available locally until the backend is reachable.
    }

    const merged = mergeContacts(contacts, [saved])
    setContacts(merged)
    saveLocalContacts(merged)
    setSelectedIds((current) => Array.from(new Set([...current, contactParticipantId(saved)])))
    setContactNotice(saved.isRegisteredUser
      ? `${saved.name} is on Fairshare and has been added to this split.`
      : `${saved.name} was saved as a phone contact. You can still track and remind them.`)
    setContactName('')
    setContactPhone('')
    setShowAddContact(false)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const total = parseMoney(amount)
    if (!description.trim()) return setError('Add a short description.')
    if (!total) return setError('Enter a valid amount with no more than two decimals.')
    if (selectedIds.length < 2) return setError('Choose at least two people for a direct split.')

    try {
      let shares
      if (splitMode === 'equal') {
        shares = splitEqually(total, selectedIds)
      } else if (splitMode === 'shares') {
        shares = splitByShares(total, selectedIds.map((userId) => ({ userId, shares: Number(customValues[userId] ?? 0) })))
      } else if (splitMode === 'percentage') {
        shares = splitByPercentages(total, selectedIds.map((userId) => ({ userId, percentage: Number(customValues[userId] ?? 0) })))
      } else {
        shares = validateExactSplit(total, selectedIds.map((userId) => {
          const raw = customValues[userId] ?? ''
          const parsed = raw.trim() === '0' ? 0 : parseMoney(raw)
          if (parsed === null) throw new Error('Every exact amount must be valid.')
          return { userId, amount: parsed }
        }))
      }

      const timestamp = new Date().toISOString()
      const people = participantUsers.filter((user) => selectedIds.includes(user.id))
      onSave({
        id: expense?.id ?? crypto.randomUUID(),
        groupId: DIRECT_SPLIT_GROUP_ID,
        description: description.trim(),
        notes: notes.trim() || undefined,
        category,
        currency: expense?.currency ?? currency,
        amount: total,
        occurredAt: date,
        createdAt: expense?.createdAt ?? timestamp,
        createdBy: expense?.createdBy ?? currentUser.id,
        payers: [{ userId: payerId, amount: total }],
        shares,
      }, people)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this direct split.')
    }
  }

  const suffix = splitMode === 'percentage' ? '%' : splitMode === 'shares' ? '×' : currencySymbol(expense?.currency ?? currency)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal direct-expense-modal" role="dialog" aria-modal="true" aria-labelledby="direct-expense-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div><span className="eyebrow"><Users size={13} /> No group needed</span><h2 id="direct-expense-title">{expense ? 'Edit direct split' : 'Split with people'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <form onSubmit={submit}>
          <section className="direct-people-section">
            <div className="direct-section-heading"><div><strong>Who is involved?</strong><span>Registered users and phone-only contacts both work.</span></div><button type="button" className="button button--soft" onClick={() => setShowAddContact((visible) => !visible)}><UserPlus size={15} /> Add person</button></div>
            {showAddContact && (
              <div className="direct-add-contact">
                <label className="field"><span>Name</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="e.g. Rohan Verma" /></label>
                <label className="field"><span>Phone number</span><input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
                <button type="button" className="button button--primary" onClick={() => void addContact()}><Plus size={15} /> Save & add</button>
              </div>
            )}
            <label className="direct-contact-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved contacts" /></label>
            <div className="direct-contact-list">
              <button type="button" className={`direct-contact-row ${selectedIds.includes(currentUser.id) ? 'is-selected' : ''}`} onClick={() => toggleParticipant(currentUser.id)}>
                <span className="direct-contact-check">{selectedIds.includes(currentUser.id) && <Check size={13} />}</span><Avatar user={currentUser} size="small" /><span><strong>{currentUser.name} (you)</strong><small>Fairshare account</small></span><i>YOU</i>
              </button>
              {filteredContacts.map((contact) => {
                const user = contactAsUser(contact)
                const selected = selectedIds.includes(user.id)
                return <button type="button" className={`direct-contact-row ${selected ? 'is-selected' : ''}`} key={contact.id} onClick={() => toggleParticipant(user.id)}><span className="direct-contact-check">{selected && <Check size={13} />}</span><Avatar user={user} size="small" /><span><strong>{contact.name}</strong><small>{contact.msisdn}</small></span><i className={contact.isRegisteredUser ? 'is-registered' : ''}>{contact.isRegisteredUser ? 'ON FAIRSHARE' : 'PHONE'}</i></button>
              })}
              {!contactsLoading && filteredContacts.length === 0 && <p className="direct-contact-empty">No saved contacts yet. Add a phone number above.</p>}
              {contactsLoading && <p className="direct-contact-empty">Checking your contacts…</p>}
            </div>
            {contactNotice && <p className="auth-alert auth-alert--success" role="status"><Check size={15} /> {contactNotice}</p>}
          </section>

          <div className="expense-primary-fields direct-expense-fields">
            <span className="receipt-mark"><ReceiptText size={28} /></span>
            <label><span className="sr-only">Description</span><input className="line-input line-input--description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was it for?" /></label>
            <label className="amount-field"><span className="currency-symbol" aria-hidden="true">{currencySymbol(expense?.currency ?? currency)}</span><span className="sr-only">Amount</span><input className="line-input line-input--amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
          </div>

          <div className="paid-by-row"><span>Paid by</span><select value={payerId} onChange={(event) => setPayerId(event.target.value)}>{participantUsers.filter((user) => selectedIds.includes(user.id)).map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select><span>and split</span></div>
          <div className="segmented-control" aria-label="Split method">{(Object.keys(splitLabels) as SplitMode[]).map((mode) => <button key={mode} type="button" className={splitMode === mode ? 'is-active' : ''} onClick={() => selectMode(mode)}>{splitLabels[mode]}</button>)}</div>
          {splitMode !== 'equal' && <div className="participant-list direct-values-list">{participantUsers.filter((user) => selectedIds.includes(user.id)).map((user) => <div className="participant" key={user.id}><Avatar user={user} size="small" /><span className="participant__name">{user.name}{user.id === currentUser.id ? ' (you)' : ''}</span><label className="participant__value"><span>{suffix}</span><input inputMode="decimal" value={customValues[user.id] ?? ''} onChange={(event) => setCustomValues((current) => ({ ...current, [user.id]: event.target.value }))} aria-label={`${splitLabels[splitMode]} value for ${user.name}`} /></label></div>)}</div>}

          <div className="form-grid"><label className="field"><span>Date</span><span className="input-with-icon"><CalendarDays size={16} /><input type="date" value={date} max={localDateValue()} onChange={(event) => setDate(event.target.value)} /></span></label><label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{['General', 'Dining', 'Groceries', 'Rent', 'Transport', 'Entertainment'].map((value) => <option value={value} key={value}>{value}</option>)}</select></label></div>
          <label className="field"><span>Notes <small>optional</small></span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context or a reminder note" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal__footer"><button className="button button--ghost" type="button" onClick={onClose}>Cancel</button><button className="button button--primary" type="submit">{expense ? 'Save changes' : 'Save direct split'}</button></footer>
        </form>
      </section>
    </div>
  )
}
