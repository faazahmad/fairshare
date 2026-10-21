import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BadgeCheck, Check, Clock, ContactRound, FileCheck2, Heart, HandCoins, ImagePlus, Landmark, MessageCircle, Phone, Plus, QrCode, ReceiptText, Search, Send, Smartphone, Trash2, Upload, UserPlus, Users, X } from 'lucide-react'
import type { Contact, Expense, MoneyRequest, NotificationChannel, User } from '../domain/types'
import { formatMoney } from '../domain/money'
import { api } from '../lib/api'
import { canPickDeviceContact, pickDeviceContact } from '../lib/deviceContacts'
import { isValidMsisdn, mergeContacts, normalizeMsisdn, readLocalContacts, recordRecentContact, saveLocalContacts } from '../lib/directSplits'
import { recordRum } from '../lib/rum'
import { ContactPicker } from '../components/ContactPicker'
import { ChannelLogo } from '../components/ChannelLogo'

type PeopleTab = 'requests' | 'contacts'
type ContactSection = 'app' | 'phone'
type RequestDirection = 'sent' | 'received'
type RequestStatus = 'open' | 'settled' | 'all'
const REQUESTS_STORAGE_KEY = 'fairshare-requests-v1'

const INVITE_MESSAGES = [
  (name: string) => `Hey ${name}, I’m using Fairshare to keep shared expenses simple. Join me so our next split takes seconds, not screenshots.`,
  (name: string) => `${name}, let’s retire the “who paid what?” detective work 😄 Join me on Fairshare for quick, clear splits.`,
  (name: string) => `A tiny invite for fewer awkward money chats: join me on Fairshare, ${name}. We can split, settle and move on.`,
  (name: string) => `Hi ${name}! I saved you a seat in my Fairshare circle—clean splits, gentle reminders, no spreadsheet chaos.`,
]

function readSavedRequests(): MoneyRequest[] {
  try { return JSON.parse(localStorage.getItem(REQUESTS_STORAGE_KEY) ?? '[]') as MoneyRequest[] } catch { return [] }
}

interface PeopleHubPageProps {
  topbar: ReactNode
  currentUser: User
  currency: string
  expenses: Expense[]
  onSplitWithContact: (contact: Contact) => void
  onOpenChat: (contact: Contact) => void
}

export function PeopleHubPage({ topbar, currentUser, currency, expenses, onSplitWithContact, onOpenChat }: PeopleHubPageProps) {
  const currentUserId = currentUser.id
  const [activeTab, setActiveTab] = useState<PeopleTab>('requests')
  const [contactSection, setContactSection] = useState<ContactSection>('app')
  const [requestDirection, setRequestDirection] = useState<RequestDirection>('sent')
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('open')
  const [requests, setRequests] = useState<MoneyRequest[]>(readSavedRequests)
  const [contacts, setContacts] = useState<Contact[]>(readLocalContacts)
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [requestDescription, setRequestDescription] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [requestReminderDays, setRequestReminderDays] = useState<'7' | '10' | '15' | '30'>('7')
  const [requestChannels, setRequestChannels] = useState<NotificationChannel[]>(['whatsapp'])
  const [requestRecipientIds, setRequestRecipientIds] = useState<string[]>([])
  const [requestExpenseId, setRequestExpenseId] = useState('')
  const [requestPaymentMode, setRequestPaymentMode] = useState<'UPI' | 'BANK' | 'QR' | ''>('')
  const [proofRequest, setProofRequest] = useState<MoneyRequest | null>(null)
  const [proofTransactionId, setProofTransactionId] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [reviewRequest, setReviewRequest] = useState<MoneyRequest | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [proofBusy, setProofBusy] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactQuery, setContactQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [inviteIndex, setInviteIndex] = useState(0)

  const paymentMethods = useMemo(() => [
    currentUser.upiId ? { id: 'UPI' as const, label: 'UPI', copy: currentUser.upiId, icon: Landmark } : null,
    currentUser.bankAccountName && currentUser.bankAccountNumber && currentUser.bankIfsc ? { id: 'BANK' as const, label: 'Bank', copy: `Ending ${currentUser.bankAccountNumber.slice(-4)}`, icon: Landmark } : null,
    currentUser.paymentQrData ? { id: 'QR' as const, label: 'Payment QR', copy: 'QR ready', icon: QrCode } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)), [currentUser])

  useEffect(() => {
    if (!requestPaymentMode && paymentMethods[0]) setRequestPaymentMode(paymentMethods[0].id)
  }, [paymentMethods, requestPaymentMode])

  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl) }, [proofUrl])

  useEffect(() => {
    let active = true
    Promise.allSettled([api.requests.list(), api.contacts.list()]).then(([requestResult, contactResult]) => {
      if (!active) return
      if (requestResult.status === 'fulfilled') {
        setRequests(requestResult.value ?? [])
        localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requestResult.value ?? []))
      }
      if (contactResult.status === 'fulfilled') {
        const merged = mergeContacts(readLocalContacts(), contactResult.value ?? [])
        setContacts(merged)
        saveLocalContacts(merged)
      }
      setLoading(false)
    })
    recordRum('view_people_hub', '/people')
    return () => { active = false }
  }, [])

  const appContacts = useMemo(() => contacts.filter((contact) => contact.isRegisteredUser || contact.contactUserId), [contacts])
  const phoneContacts = useMemo(() => contacts.filter((contact) => !contact.isRegisteredUser && !contact.contactUserId), [contacts])
  const visibleContacts = useMemo(() => {
    const source = contactSection === 'app' ? appContacts : phoneContacts
    const needle = contactQuery.trim().toLowerCase()
    return source.filter((contact) => !needle || contact.name.toLowerCase().includes(needle) || contact.msisdn.includes(needle))
  }, [appContacts, contactQuery, contactSection, phoneContacts])
  const openRequests = useMemo(() => requests.filter((request) => request.status === 'open' || request.status === 'proof_submitted').length, [requests])
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const sent = request.fromUserId === currentUserId
    if ((requestDirection === 'sent') !== sent) return false
    if (requestStatus === 'all') return true
    return requestStatus === 'open' ? request.status === 'open' || request.status === 'proof_submitted' : request.status === requestStatus
  }), [currentUserId, requestDirection, requestStatus, requests])

  async function saveContact(nameValue: string, phoneValue: string) {
    const name = nameValue.trim()
    const msisdn = normalizeMsisdn(phoneValue)
    if (name.length < 2) throw new Error('Enter the contact’s name.')
    if (!isValidMsisdn(msisdn)) throw new Error('Choose a contact with a valid phone number.')
    const existing = contacts.find((contact) => normalizeMsisdn(contact.msisdn) === msisdn)
    const localContact: Contact = existing ?? { id: crypto.randomUUID(), name, msisdn, addedAt: new Date().toISOString(), isRegisteredUser: false, favorite: false }
    let saved = { ...localContact, name }
    try { saved = await api.contacts.add({ name, msisdn }) } catch { /* Contact remains usable offline. */ }
    const next = mergeContacts(contacts, [saved])
    setContacts(next); saveLocalContacts(next)
    setContactSection(saved.isRegisteredUser ? 'app' : 'phone')
    setNotice(saved.isRegisteredUser ? `${saved.name} is on Fairshare—chat and direct splits are ready.` : `${saved.name} is saved for direct splits and server reminders.`)
    return saved
  }

  async function addManualContact(event: React.FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    try { await saveContact(contactName, contactPhone); setContactName(''); setContactPhone(''); setShowContactForm(false); recordRum('contact_added', '/people', { source: 'manual' }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add that contact.') }
  }

  async function importFromPhone() {
    setError(''); setNotice(''); setImporting(true)
    try { const picked = await pickDeviceContact(); await saveContact(picked.name, picked.msisdn); recordRum('contact_added', '/people', { source: 'device_picker' }) }
    catch (caught) { const message = caught instanceof Error ? caught.message : 'Could not access that phone contact.'; if (!message.toLowerCase().includes('cancel')) setError(message) }
    finally { setImporting(false) }
  }

  async function toggleFavourite(contact: Contact) {
    const favorite = !contact.favorite
    const next = contacts.map((entry) => entry.id === contact.id ? { ...entry, favorite } : entry)
    setContacts(next); saveLocalContacts(next)
    try {
      const saved = await api.contacts.update(contact.id, { favorite })
      const merged = mergeContacts(next, [saved]); setContacts(merged); saveLocalContacts(merged)
    } catch { setNotice(`${contact.name} was ${favorite ? 'added to' : 'removed from'} favourites on this device.`) }
  }

  async function removeContact(contact: Contact) {
    if (!window.confirm(`Remove ${contact.name} from Fairshare contacts?`)) return
    try { await api.contacts.delete(contact.id) } catch { /* local removal still works offline */ }
    const next = contacts.filter((entry) => normalizeMsisdn(entry.msisdn) !== normalizeMsisdn(contact.msisdn))
    setContacts(next); saveLocalContacts(next)
  }

  async function invite(contact: Contact) {
    const template = INVITE_MESSAGES[inviteIndex % INVITE_MESSAGES.length] ?? INVITE_MESSAGES[0]!
    const message = template(contact.name)
    setInviteIndex((value) => value + 1)
    try {
      if (navigator.share) await navigator.share({ title: 'Join me on Fairshare', text: message })
      else { await navigator.clipboard.writeText(message); setNotice(`A fresh invite for ${contact.name} was copied. Share it in any app you like.`) }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError('The invite could not be shared. Please try again.')
    }
  }

  function selectExpense(expenseId: string) {
    setRequestExpenseId(expenseId)
    const selected = expenses.find((expense) => expense.id === expenseId)
    if (selected) { setRequestDescription(selected.description); setRequestAmount((selected.amount / 100).toFixed(2)) }
  }

  function toggleRequestChannel(channel: NotificationChannel) {
    setRequestChannels((current) => current.includes(channel)
      ? current.length === 1 ? current : current.filter((value) => value !== channel)
      : [...current, channel])
  }

  function closeRequestModal() {
    setShowRequestForm(false)
    setError('')
  }

  async function createRequest(event: React.FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    const amountMinor = Math.round(Number(requestAmount) * 100)
    const selectedContact = contacts.find((contact) => contact.id === requestRecipientIds[0])
    if (!selectedContact) return setError('Choose the payer for this request.')
    if (requestDescription.trim().length < 2) return setError('Add a reason or choose an expense.')
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError('Enter a valid amount.')
    if (!requestPaymentMode) return setError('Add UPI, bank, or payment QR details to your profile, then choose one here.')
    const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    const draft: MoneyRequest = {
      id: crypto.randomUUID(), fromUserId: currentUserId, toUserId: selectedContact.contactUserId,
      contactId: selectedContact.id, payerName: selectedContact.name, payerMsisdn: selectedContact.msisdn,
      expenseId: requestExpenseId || undefined, description: requestDescription.trim(), currency, amountMinor,
      reminderIntervalDays: Number(requestReminderDays) as 7 | 10 | 15 | 30,
      reminderChannels: requestChannels,
      paymentMode: requestPaymentMode,
      expiresAt: expiresAt.toISOString(), status: 'open', createdAt: new Date().toISOString(),
    }
    let saved: MoneyRequest
    try { saved = await api.requests.create(draft) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The request could not be created.'); return }
    const next = [saved, ...requests.filter((request) => request.id !== saved.id)]
    setRequests(next); localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(next)); recordRecentContact(selectedContact.id)
    setRequestDescription(''); setRequestAmount(''); setRequestRecipientIds([]); setRequestExpenseId(''); setRequestChannels(['whatsapp']); setShowRequestForm(false)
    setNotice(`Request saved. Fairshare will remind ${selectedContact.name} every ${requestReminderDays} days until payment is verified.`)
    recordRum('money_request_created', '/people', { intervalDays: requestReminderDays })
  }

  async function updateRequest(id: string, action: 'settle' | 'cancel') {
    try {
      const saved = action === 'settle' ? await api.requests.settle(id) : await api.requests.cancel(id)
      replaceRequest(saved)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The request could not be updated.') }
  }

  function replaceRequest(saved: MoneyRequest) {
    setRequests((current) => {
      const next = current.map((request) => request.id === saved.id ? saved : request)
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function chooseProof(file: File | null) {
    setError('')
    if (!file) { setProofFile(null); return }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Payment proof must be a PNG, JPEG, or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Payment proof must be smaller than 5 MB.'); return }
    setProofFile(file)
  }

  async function submitProof(event: React.FormEvent) {
    event.preventDefault()
    if (!proofRequest || !proofFile) return setError('Attach your payment screenshot.')
    if (proofTransactionId.trim().length < 4) return setError('Enter the transaction ID from your payment app.')
    setProofBusy(true); setError('')
    try {
      const saved = await api.requests.submitProof(proofRequest.id, proofTransactionId.trim(), proofFile)
      replaceRequest(saved); setProofRequest(null); setProofTransactionId(''); setProofFile(null)
      setNotice('Payment proof sent. The requester can now cross-check and approve it.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Payment proof could not be submitted.') }
    finally { setProofBusy(false) }
  }

  async function openProofReview(request: MoneyRequest) {
    setProofBusy(true); setError('')
    try {
      const blob = await api.requests.proof(request.id)
      if (proofUrl) URL.revokeObjectURL(proofUrl)
      setProofUrl(URL.createObjectURL(blob)); setReviewRequest(request)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Payment proof could not be loaded.') }
    finally { setProofBusy(false) }
  }

  async function verifyProof() {
    if (!reviewRequest) return
    setProofBusy(true); setError('')
    try {
      const saved = await api.requests.verify(reviewRequest.id)
      replaceRequest(saved); setReviewRequest(null)
      if (proofUrl) URL.revokeObjectURL(proofUrl); setProofUrl('')
      setNotice('Payment proof approved. This request is now settled.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Payment proof could not be approved.') }
    finally { setProofBusy(false) }
  }

  function splitWith(contact: Contact) { recordRecentContact(contact.id); onSplitWithContact(contact) }

  return <>
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content people-page">
        <section className="people-hero"><span className="people-hero__icon"><HandCoins size={24} /></span><div><span className="eyebrow">People & requests</span><h1>Money between people</h1><p>Your contacts, conversations and gentle payment follow-ups in one place.</p></div></section>
        <div className="people-tabs" role="tablist" aria-label="Money and contacts">
          <button className={activeTab === 'requests' ? 'is-active' : ''} onClick={() => { setActiveTab('requests'); setError(''); setNotice('') }}><Clock size={16} /><span>Money requests</span><i>{openRequests}</i></button>
          <button className={activeTab === 'contacts' ? 'is-active' : ''} onClick={() => { setActiveTab('contacts'); setError(''); setNotice('') }}><Users size={16} /><span>Contacts</span><i>{contacts.length}</i></button>
        </div>
        {loading && <p className="people-loading" role="status">Refreshing your people hub…</p>}
        {notice && <p className="auth-alert auth-alert--success contact-notice" role="status"><Check size={15} /> {notice}</p>}
        {error && <p className="form-error people-error" role="alert">{error}</p>}

        {activeTab === 'requests' && <section className="people-section request-hub">
          <header><div><span className="eyebrow">Track & follow up</span><h2>Money requests</h2><p>Choose an expense or enter an amount, then let Fairshare handle the reminder rhythm.</p></div><button className="button button--primary people-header-action" aria-label="New request" onClick={() => { setError(''); setShowRequestForm(true) }}><Plus size={16} /><span>New request</span></button></header>
          <div className="request-controls">
            <div className="request-direction" role="tablist"><button className={requestDirection === 'sent' ? 'is-active' : ''} onClick={() => setRequestDirection('sent')}><Send size={14} /> Sent</button><button className={requestDirection === 'received' ? 'is-active' : ''} onClick={() => setRequestDirection('received')}><ReceiptText size={14} /> Received</button></div>
            <div className="request-status-filter">{(['open', 'settled', 'all'] as RequestStatus[]).map((status) => <button className={requestStatus === status ? 'is-active' : ''} key={status} onClick={() => setRequestStatus(status)}>{status === 'open' ? 'Open' : status === 'settled' ? 'Settled' : 'All'}</button>)}</div>
          </div>
          {filteredRequests.length === 0 ? <div className="no-results"><Clock size={27} /><strong>No {requestStatus === 'all' ? '' : requestStatus} {requestDirection} requests</strong><span>{requestDirection === 'sent' ? 'Create one from a contact or an existing expense.' : 'Requests sent to your Fairshare account will appear here.'}</span></div> : <div className="request-list">{filteredRequests.map((request) => {
            const recipient = contacts.find((contact) => contact.id === request.contactId || contact.contactUserId === request.toUserId || normalizeMsisdn(contact.msisdn) === normalizeMsisdn(request.payerMsisdn ?? ''))
            const expired = request.status === 'open' && new Date(request.expiresAt) < new Date()
            const statusCopy = expired ? 'expired' : request.status === 'proof_submitted' ? 'proof awaiting review' : request.status
            return <article className={`request-card ${request.status === 'proof_submitted' ? 'has-proof' : ''}`} key={request.id}>
              <span className="request-card__icon">{request.status === 'proof_submitted' ? <FileCheck2 size={19} /> : <ReceiptText size={19} />}</span>
              <div><strong>{request.description}</strong><small>{requestDirection === 'sent' ? recipient?.name ?? request.payerName ?? 'Payer' : request.payerName ?? 'Payment request'} · {statusCopy}</small><span>{request.reminderIntervalDays ? `Reminder every ${request.reminderIntervalDays} days` : `Expires ${new Date(request.expiresAt).toLocaleDateString()}`}</span>{request.paymentInstructions && <span className="request-payment-summary"><Landmark size={13} /> {request.paymentInstructions}</span>}</div>
              <strong>{formatMoney(request.amountMinor, request.currency)}</strong>
              {request.paymentMode === 'QR' && request.paymentQrData && requestDirection === 'received' && <img className="request-payment-qr" src={request.paymentQrData} alt="Payment QR" />}
              {request.status === 'open' && !expired && <footer>
                {requestDirection === 'received' ? <button className="button button--primary" onClick={() => { setProofRequest(request); setProofTransactionId(''); setProofFile(null); setError('') }}><Upload size={15} /> I’ve paid</button> : request.toUserId ? <span className="request-awaiting"><Clock size={14} /> Awaiting payer</span> : <button className="button button--soft" onClick={() => void updateRequest(request.id, 'settle')}>Mark settled</button>}
                {requestDirection === 'sent' && <button className="button button--ghost" onClick={() => void updateRequest(request.id, 'cancel')}>Cancel</button>}
              </footer>}
              {request.status === 'proof_submitted' && <footer>{requestDirection === 'sent' ? <button className="button button--primary" disabled={proofBusy} onClick={() => void openProofReview(request)}><FileCheck2 size={15} /> Review payment proof</button> : <span className="request-awaiting"><Check size={14} /> Proof sent for review</span>}</footer>}
            </article>
          })}</div>}
        </section>}

        {activeTab === 'contacts' && <section className="people-section contacts-hub">
          <header className="contacts-hub__header"><div><span className="eyebrow">Your people</span><h2>Contacts</h2><p>One phone number maps to one person, so imports never create a second conflicting identity.</p></div><div className="contact-header-actions"><button className="button button--secondary" aria-label="Import from phone" onClick={() => void importFromPhone()} disabled={importing}><Smartphone size={16} /><span>{importing ? 'Opening…' : 'Import from phone'}</span></button><button className="button button--primary" aria-label="Add contact manually" onClick={() => setShowContactForm((open) => !open)}><UserPlus size={16} /><span>Add manually</span></button></div></header>
          {!canPickDeviceContact() && <p className="device-contact-note"><Smartphone size={14} /> Phone import activates in the installed iOS or Android app; manual entry works everywhere.</p>}
          {showContactForm && <form className="contact-add-form" onSubmit={addManualContact}><div><span className="contact-add-form__icon"><ContactRound size={20} /></span><div><h3>Add by phone number</h3><p>We will merge this with their Fairshare account when the number matches.</p></div></div><div className="contact-add-form__fields"><label className="field"><span>Full name</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="e.g. Rohan Verma" /></label><label className="field"><span>Phone number</span><input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+91 98765 43210" /></label></div><div className="contact-add-form__actions"><button className="button button--primary" type="submit">Save & check Fairshare</button><button className="button button--ghost" type="button" onClick={() => setShowContactForm(false)}>Cancel</button></div></form>}
          <div className="contacts-toolbar">
            <div className="contact-section-tabs" role="tablist"><button className={contactSection === 'app' ? 'is-active' : ''} onClick={() => setContactSection('app')}><BadgeCheck size={15} /><span>On Fairshare</span><i>{appContacts.length}</i></button><button className={contactSection === 'phone' ? 'is-active' : ''} onClick={() => setContactSection('phone')}><Phone size={15} /><span>Phone & invited</span><i>{phoneContacts.length}</i></button></div>
            <label className="contacts-search"><Search size={16} /><input value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="Search contacts" /></label>
          </div>
          {visibleContacts.length === 0 ? <div className="no-results"><Phone size={28} /><strong>{contactQuery ? 'No matching contacts' : contactSection === 'app' ? 'No Fairshare contacts yet' : 'No phone contacts saved'}</strong><span>{contactSection === 'app' ? 'Matching registered users will appear here automatically.' : 'Import from your phone or add a number manually.'}</span></div> : <div className="contact-card-grid">{visibleContacts.map((contact) => <article className="contact-card" key={contact.id}>
            <button className={`contact-favourite ${contact.favorite ? 'is-favourite' : ''}`} onClick={() => void toggleFavourite(contact)} aria-label={`${contact.favorite ? 'Remove' : 'Add'} ${contact.name} ${contact.favorite ? 'from' : 'to'} favourites`}><Heart size={17} fill={contact.favorite ? 'currentColor' : 'none'} /></button>
            <div className="contact-card__identity"><span className="contact-card__avatar">{contact.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span><strong>{contact.name}</strong><small>{contact.msisdn}</small></span><i className={contactSection === 'app' ? 'is-registered' : ''}>{contactSection === 'app' ? <><BadgeCheck size={13} /> On Fairshare</> : <><Phone size={13} /> Phone contact</>}</i></div>
            <p>{contactSection === 'app' ? 'Split directly and continue the conversation without leaving Fairshare.' : 'Track a split now, then invite them when the moment feels right.'}</p>
            <div className="contact-card__actions"><button className="button button--primary" onClick={() => splitWith(contact)}><ReceiptText size={15} /> Split expense</button>{contactSection === 'app' ? <button className="button button--secondary" onClick={() => { recordRecentContact(contact.id); onOpenChat(contact) }}><MessageCircle size={15} /> Chat</button> : <button className="button button--secondary" onClick={() => void invite(contact)}><Send size={15} /> Invite</button>}<button className="tiny-icon-button" onClick={() => void removeContact(contact)} aria-label={`Remove ${contact.name}`}><Trash2 size={15} /></button></div>
          </article>)}</div>}
        </section>}
      </div>
    </main>
    {showRequestForm && <div className="modal-backdrop" role="presentation" onMouseDown={closeRequestModal}>
      <section className="modal form-modal request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow">Private follow-up</span><h2 id="request-modal-title">Create money request</h2><p>Choose a payer, amount and reminder route.</p></div><button className="icon-button" type="button" onClick={closeRequestModal} aria-label="Close request"><X size={20} /></button></header>
        <form onSubmit={createRequest}>
          <div className="modal__scroll request-modal__body">
            <ContactPicker contacts={contacts} selectedIds={requestRecipientIds} onChange={setRequestRecipientIds} label="Payer" />
            <div className="request-form__fields">
              <label className="field"><span>Link an existing expense <small>optional</small></span><select value={requestExpenseId} onChange={(event) => selectExpense(event.target.value)}><option value="">Enter a request manually</option>{expenses.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((expense) => <option key={expense.id} value={expense.id}>{expense.description} · {formatMoney(expense.amount, expense.currency)}</option>)}</select></label>
              <label className="field"><span>Reason</span><input value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} placeholder="e.g. Your share of dinner" /></label>
              <div className="form-grid"><label className="field"><span>Amount</span><input inputMode="decimal" value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} placeholder="0.00" /></label><label className="field"><span>Remind every</span><select value={requestReminderDays} onChange={(event) => setRequestReminderDays(event.target.value as typeof requestReminderDays)}><option value="7">7 days</option><option value="10">10 days</option><option value="15">15 days</option><option value="30">30 days</option></select></label></div>
              <fieldset className="payment-method-picker"><legend>How should the payer pay you?</legend>{paymentMethods.length ? <div>{paymentMethods.map(({ id, label, copy, icon: Icon }) => <button type="button" className={requestPaymentMode === id ? 'is-active' : ''} onClick={() => setRequestPaymentMode(id)} key={id}><Icon size={17} /><span><strong>{label}</strong><small>{copy}</small></span>{requestPaymentMode === id && <Check size={14} />}</button>)}</div> : <p><Landmark size={16} /> Add a UPI ID, bank account, or payment QR from Edit profile before creating a request.</p>}</fieldset>
              <fieldset className="notification-channel-picker"><legend>Send reminders using</legend><div><button type="button" className={requestChannels.includes('whatsapp') ? 'is-active' : ''} onClick={() => toggleRequestChannel('whatsapp')}><ChannelLogo channel="whatsapp" size={17} /><span><strong>WhatsApp</strong><small>Fairshare business account</small></span><i>{requestChannels.includes('whatsapp') && <Check size={13} />}</i></button><button type="button" className={requestChannels.includes('instagram') ? 'is-active' : ''} onClick={() => toggleRequestChannel('instagram')}><ChannelLogo channel="instagram" size={17} /><span><strong>Instagram</strong><small>Fairshare professional account</small></span><i>{requestChannels.includes('instagram') && <Check size={13} />}</i></button></div></fieldset>
              <p className="request-form__promise"><Clock size={14} /> Reminders pause when a registered payer submits proof and stop after you verify it. Instagram delivery activates after the payer has messaged Fairshare’s connected professional account.</p>
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
          </div>
          <footer className="modal__footer"><button className="button button--ghost" type="button" onClick={closeRequestModal}>Cancel</button><button className="button button--primary" type="submit">Create request</button></footer>
        </form>
      </section>
    </div>}
    {proofRequest && <div className="modal-backdrop" role="presentation" onMouseDown={() => setProofRequest(null)}>
      <section className="modal form-modal settlement-proof-modal" role="dialog" aria-modal="true" aria-labelledby="proof-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow">Confirm your payment</span><h2 id="proof-modal-title">Send payment proof</h2><p>The requester will cross-check this before the request is settled.</p></div><button className="icon-button" type="button" onClick={() => setProofRequest(null)} aria-label="Close proof form"><X size={20} /></button></header>
        <form onSubmit={submitProof}><div className="modal__scroll settlement-proof-body"><div className="proof-request-summary"><span><ReceiptText size={19} /></span><div><strong>{proofRequest.description}</strong><small>{formatMoney(proofRequest.amountMinor, proofRequest.currency)} · {proofRequest.paymentMode}</small></div></div><label className="field"><span>Transaction ID</span><input value={proofTransactionId} onChange={(event) => setProofTransactionId(event.target.value)} placeholder="From your bank or payment app" autoComplete="off" /></label><label className={`proof-upload ${proofFile ? 'has-file' : ''}`}><ImagePlus size={24} /><span><strong>{proofFile ? proofFile.name : 'Attach payment screenshot'}</strong><small>PNG, JPEG, or WebP · up to 5 MB</small></span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseProof(event.target.files?.[0] ?? null)} /></label>{error && <p className="form-error" role="alert">{error}</p>}</div><footer className="modal__footer"><button className="button button--ghost" type="button" onClick={() => setProofRequest(null)}>Cancel</button><button className="button button--primary" type="submit" disabled={proofBusy}>{proofBusy ? 'Sending…' : 'Send for verification'}</button></footer></form>
      </section>
    </div>}
    {reviewRequest && <div className="modal-backdrop" role="presentation" onMouseDown={() => setReviewRequest(null)}>
      <section className="modal form-modal settlement-proof-modal" role="dialog" aria-modal="true" aria-labelledby="review-proof-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow">Cross-check payment</span><h2 id="review-proof-title">Review payment proof</h2><p>Compare the reference and screenshot with your receiving account.</p></div><button className="icon-button" type="button" onClick={() => setReviewRequest(null)} aria-label="Close proof review"><X size={20} /></button></header>
        <div className="modal__scroll settlement-proof-body"><dl className="proof-review-details"><div><dt>Request</dt><dd>{reviewRequest.description}</dd></div><div><dt>Amount</dt><dd>{formatMoney(reviewRequest.amountMinor, reviewRequest.currency)}</dd></div><div><dt>Transaction ID</dt><dd>{reviewRequest.settlementTransactionId}</dd></div></dl>{proofUrl && <img className="proof-review-image" src={proofUrl} alt="Payer’s payment screenshot" />}{error && <p className="form-error" role="alert">{error}</p>}</div><footer className="modal__footer"><button className="button button--ghost" type="button" onClick={() => setReviewRequest(null)}>Check later</button><button className="button button--primary" type="button" disabled={proofBusy} onClick={() => void verifyProof()}><Check size={16} /> {proofBusy ? 'Approving…' : 'Approve & settle'}</button></footer>
      </section>
    </div>}
  </>
}
