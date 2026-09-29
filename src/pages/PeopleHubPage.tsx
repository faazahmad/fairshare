import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BadgeCheck, Check, Clock, ContactRound, HandCoins, MessageCircle, Phone, Plus, ReceiptText, Smartphone, Trash2, UserPlus, Users } from 'lucide-react'
import type { Contact, MoneyRequest } from '../domain/types'
import { formatMoney } from '../domain/money'
import { api } from '../lib/api'
import { canPickDeviceContact, pickDeviceContact } from '../lib/deviceContacts'
import { isValidMsisdn, mergeContacts, normalizeMsisdn, readLocalContacts, saveLocalContacts } from '../lib/directSplits'
import { recordRum } from '../lib/rum'

type PeopleTab = 'requests' | 'contacts'
const REQUESTS_STORAGE_KEY = 'fairshare-requests-v1'

function readSavedRequests(): MoneyRequest[] {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_STORAGE_KEY) ?? '[]') as MoneyRequest[]
  } catch {
    return []
  }
}

interface PeopleHubPageProps {
  topbar: ReactNode
  currentUserId: string
  currency: string
  onSplitWithContact: (contact: Contact) => void
}

export function PeopleHubPage({ topbar, currentUserId, currency, onSplitWithContact }: PeopleHubPageProps) {
  const [activeTab, setActiveTab] = useState<PeopleTab>('requests')
  const [requests, setRequests] = useState<MoneyRequest[]>(readSavedRequests)
  const [contacts, setContacts] = useState<Contact[]>(readLocalContacts)
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [requestDescription, setRequestDescription] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [requestExpiryDays, setRequestExpiryDays] = useState('7')
  const [requestRecipient, setRequestRecipient] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

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

  const openRequests = useMemo(() => requests.filter((request) => request.status === 'open').length, [requests])

  async function saveContact(nameValue: string, phoneValue: string) {
    const name = nameValue.trim()
    const msisdn = normalizeMsisdn(phoneValue)
    if (name.length < 2) throw new Error('Enter the contact’s name.')
    if (!isValidMsisdn(msisdn)) throw new Error('Choose a contact with a valid phone number.')

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
      // A selected phone contact remains usable offline.
    }
    const next = mergeContacts(contacts, [saved])
    setContacts(next)
    saveLocalContacts(next)
    setNotice(saved.isRegisteredUser
      ? `${saved.name} is already on Fairshare and is ready for in-app splits.`
      : `${saved.name} was added as a phone contact and can receive WhatsApp reminders.`)
    return saved
  }

  async function addManualContact(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await saveContact(contactName, contactPhone)
      setContactName('')
      setContactPhone('')
      setShowContactForm(false)
      recordRum('contact_added', '/people', { source: 'manual' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add that contact.')
    }
  }

  async function importFromPhone() {
    setError('')
    setNotice('')
    setImporting(true)
    try {
      const picked = await pickDeviceContact()
      await saveContact(picked.name, picked.msisdn)
      recordRum('contact_added', '/people', { source: 'device_picker' })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not access that phone contact.'
      if (!message.toLowerCase().includes('cancel')) setError(message)
    } finally {
      setImporting(false)
    }
  }

  async function removeContact(contact: Contact) {
    if (!window.confirm(`Remove ${contact.name} from Fairshare contacts?`)) return
    try {
      await api.contacts.delete(contact.id)
    } catch {
      // Local removal still works if the backend is temporarily unavailable.
    }
    const next = contacts.filter((entry) => entry.id !== contact.id)
    setContacts(next)
    saveLocalContacts(next)
  }

  async function createRequest(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    const amountMinor = Math.round(Number(requestAmount) * 100)
    if (requestDescription.trim().length < 2) return setError('Add a reason for the request.')
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return setError('Enter a valid amount.')
    if (!requestRecipient.trim()) return setError('Choose a contact or enter their phone number.')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + Number(requestExpiryDays))
    const selectedContact = contacts.find((contact) => contact.id === requestRecipient)
    const draft: MoneyRequest = {
      id: crypto.randomUUID(),
      fromUserId: currentUserId,
      toUserId: selectedContact?.contactUserId ?? selectedContact?.msisdn ?? requestRecipient.trim(),
      description: requestDescription.trim(),
      currency,
      amountMinor,
      expiresAt: expiresAt.toISOString(),
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    let saved = draft
    try {
      saved = await api.requests.create(draft)
    } catch {
      // Phone-only and offline requests remain available on this device.
    }
    const next = [saved, ...requests.filter((request) => request.id !== saved.id)]
    setRequests(next)
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(next))
    setRequestDescription('')
    setRequestAmount('')
    setRequestRecipient('')
    setShowRequestForm(false)
    setNotice('Money request saved. You can now share a reminder with the recipient.')
    recordRum('money_request_created', '/people')
  }

  async function updateRequest(id: string, action: 'settle' | 'cancel') {
    try {
      if (action === 'settle') await api.requests.settle(id)
      else await api.requests.cancel(id)
    } catch {
      // Preserve the action locally while offline.
    }
    const next = requests.map((request) => request.id === id ? { ...request, status: action === 'settle' ? 'settled' as const : 'cancelled' as const } : request)
    setRequests(next)
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(next))
  }

  function openWhatsApp(msisdn: string, name: string) {
    const cleanPhone = msisdn.replace(/\D/g, '')
    const text = encodeURIComponent(`Hi ${name}! Here’s a friendly reminder about our Fairshare balance.`)
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content people-page">
        <section className="people-hero">
          <span className="people-hero__icon"><HandCoins size={24} /></span>
          <div><span className="eyebrow">People & requests</span><h1>Money between people</h1><p>Request money, add someone from your phone and split without forcing them to register first.</p></div>
        </section>

        <div className="people-tabs" role="tablist" aria-label="Money and contacts">
          <button className={activeTab === 'requests' ? 'is-active' : ''} onClick={() => { setActiveTab('requests'); setError(''); setNotice('') }}><Clock size={16} /><span>Money requests</span><i>{openRequests}</i></button>
          <button className={activeTab === 'contacts' ? 'is-active' : ''} onClick={() => { setActiveTab('contacts'); setError(''); setNotice('') }}><Users size={16} /><span>Contacts</span><i>{contacts.length}</i></button>
        </div>

        {loading && <p className="people-loading" role="status">Refreshing your people hub…</p>}
        {notice && <p className="auth-alert auth-alert--success contact-notice" role="status"><Check size={15} /> {notice}</p>}
        {error && <p className="form-error people-error" role="alert">{error}</p>}

        {activeTab === 'requests' && (
          <section className="people-section">
            <header><div><span className="eyebrow">Track & follow up</span><h2>Money requests</h2><p>Every request has a deadline and a clear settled or cancelled state.</p></div><button className="button button--primary" onClick={() => setShowRequestForm((open) => !open)}><Plus size={16} /> New request</button></header>
            {showRequestForm && (
              <form className="request-form" onSubmit={createRequest}>
                <label className="field"><span>Recipient</span><select value={requestRecipient} onChange={(event) => setRequestRecipient(event.target.value)}><option value="">Choose a saved contact</option>{contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.name} · {contact.msisdn}</option>)}</select></label>
                <label className="field"><span>Reason</span><input value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} placeholder="e.g. Concert ticket share" /></label>
                <label className="field"><span>Amount</span><input inputMode="decimal" value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} placeholder="0.00" /></label>
                <label className="field"><span>Expires in</span><select value={requestExpiryDays} onChange={(event) => setRequestExpiryDays(event.target.value)}><option value="1">24 hours</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option></select></label>
                <button className="button button--primary" type="submit">Save request</button>
              </form>
            )}
            {requests.length === 0 ? <div className="no-results"><Clock size={27} /><strong>No money requests yet</strong><span>Create one once you have added a contact.</span></div> : (
              <div className="request-list">{requests.map((request) => {
                const recipient = contacts.find((contact) => contact.contactUserId === request.toUserId || contact.msisdn === request.toUserId)
                const expired = request.status === 'open' && new Date(request.expiresAt) < new Date()
                return <article className="request-card" key={request.id}><span className="request-card__icon"><ReceiptText size={19} /></span><div><strong>{request.description}</strong><small>{recipient?.name ?? request.toUserId} · {expired ? 'Expired' : request.status}</small><span>Expires {new Date(request.expiresAt).toLocaleDateString()}</span></div><strong>{formatMoney(request.amountMinor, request.currency)}</strong>{request.status === 'open' && !expired && <footer><button className="button button--soft" onClick={() => void updateRequest(request.id, 'settle')}>Mark settled</button><button className="button button--ghost" onClick={() => void updateRequest(request.id, 'cancel')}>Cancel</button></footer>}</article>
              })}</div>
            )}
          </section>
        )}

        {activeTab === 'contacts' && (
          <section className="people-section contacts-hub">
            <header className="contacts-hub__header"><div><span className="eyebrow">Your people</span><h2>Contacts</h2><p>Only the person you select is sent to Fairshare for registered-user matching.</p></div><div className="contact-header-actions"><button className="button button--secondary" onClick={() => void importFromPhone()} disabled={importing}><Smartphone size={16} /> {importing ? 'Opening…' : 'Import from phone'}</button><button className="button button--primary" onClick={() => setShowContactForm((open) => !open)}><UserPlus size={16} /> Add manually</button></div></header>
            {!canPickDeviceContact() && <p className="device-contact-note"><Smartphone size={14} /> Phone import activates in the installed iOS or Android app; manual entry remains available here.</p>}
            {showContactForm && <form className="contact-add-form" onSubmit={addManualContact}><div><span className="contact-add-form__icon"><ContactRound size={20} /></span><div><h3>Add by phone number</h3><p>Fairshare checks the selected number for an existing account.</p></div></div><div className="contact-add-form__fields"><label className="field"><span>Full name</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="e.g. Rohan Verma" /></label><label className="field"><span>Phone number</span><input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+91 98765 43210" /></label></div><div className="contact-add-form__actions"><button className="button button--primary" type="submit">Save & check Fairshare</button><button className="button button--ghost" type="button" onClick={() => setShowContactForm(false)}>Cancel</button></div></form>}
            {contacts.length === 0 ? <div className="no-results"><Phone size={28} /><strong>No contacts saved</strong><span>Import one from your phone or add their number manually.</span></div> : (
              <div className="contact-card-grid">{contacts.map((contact) => <article className="contact-card" key={contact.id}><div className="contact-card__identity"><span className="contact-card__avatar">{contact.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span><strong>{contact.name}</strong><small>{contact.msisdn}</small></span><i className={contact.isRegisteredUser ? 'is-registered' : ''}>{contact.isRegisteredUser ? <><BadgeCheck size={13} /> On Fairshare</> : <><Phone size={13} /> Phone contact</>}</i></div><p>{contact.isRegisteredUser ? 'Linked to their Fairshare account.' : 'Usable for direct splits and WhatsApp reminders.'}</p><div className="contact-card__actions"><button className="button button--primary" onClick={() => onSplitWithContact(contact)}><ReceiptText size={15} /> Split expense</button><button className="button button--secondary" onClick={() => openWhatsApp(contact.msisdn, contact.name)}><MessageCircle size={15} /> Chat</button><button className="tiny-icon-button" onClick={() => void removeContact(contact)} aria-label={`Remove ${contact.name}`}><Trash2 size={15} /></button></div></article>)}</div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
