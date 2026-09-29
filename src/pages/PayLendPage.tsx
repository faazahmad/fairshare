import { useEffect, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  HandCoins,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  ReceiptText,
  UserPlus,
  Users,
} from 'lucide-react'
import type { Contact, MoneyRequest, UpcomingBill } from '../domain/types'
import { api } from '../lib/api'
import { formatMoney } from '../domain/money'
import { recordRum } from '../lib/rum'
import { isValidMsisdn, mergeContacts, normalizeMsisdn, readLocalContacts, saveLocalContacts } from '../lib/directSplits'

interface PayLendPageProps {
  topbar: ReactNode
  onSplitWithContact: (contact: Contact) => void
}

type TabType = 'bills' | 'requests' | 'contacts'

export function PayLendPage({ topbar, onSplitWithContact }: PayLendPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('bills')
  const [bills, setBills] = useState<UpcomingBill[]>([])
  const [requests, setRequests] = useState<MoneyRequest[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  // Forms states
  const [showAddBill, setShowAddBill] = useState(false)
  const [billDesc, setBillDesc] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDate, setBillDueDate] = useState('')
  const [billRecurrence, setBillRecurrence] = useState<'once' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  const [showAddRequest, setShowAddRequest] = useState(false)
  const [requestDesc, setRequestDesc] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [requestExpiryDays, setRequestExpiryDays] = useState('7')
  const [requestRecipient, setRequestRecipient] = useState('')

  const [showAddContact, setShowAddContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactMsisdn, setContactMsisdn] = useState('')
  const [contactNotice, setContactNotice] = useState('')
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    recordRum('view_pay_lend_page', '/pay', { tab: activeTab })
    loadData()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'bills') {
        const fetched = await api.bills.list()
        setBills(fetched || [])
      } else if (activeTab === 'requests') {
        const fetched = await api.requests.list()
        setRequests(fetched || [])
      } else if (activeTab === 'contacts') {
        const fetched = await api.contacts.list()
        const merged = mergeContacts(fetched || [], readLocalContacts())
        setContacts(merged)
        saveLocalContacts(merged)
      }
    } catch {
      // If backend is not connected, use localStorage mockup so UI remains interactive
      const savedBills = localStorage.getItem('fairshare-bills-v1')
      if (savedBills) setBills(JSON.parse(savedBills))

      const savedReqs = localStorage.getItem('fairshare-requests-v1')
      if (savedReqs) setRequests(JSON.parse(savedReqs))

      setContacts(readLocalContacts())
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault()
    const amountMinor = Math.round(parseFloat(billAmount || '0') * 100)
    if (!billDesc.trim() || amountMinor <= 0 || !billDueDate) return

    const newBill: UpcomingBill = {
      id: crypto.randomUUID(),
      description: billDesc.trim(),
      currency: 'INR',
      amountMinor,
      dueDate: billDueDate,
      recurrence: billRecurrence,
      status: new Date(billDueDate) < new Date() ? 'overdue' : 'pending',
      assignedUserIds: [],
    }

    try {
      const created = await api.bills.create(newBill)
      setBills([created, ...bills])
    } catch {
      const updated = [newBill, ...bills]
      setBills(updated)
      localStorage.setItem('fairshare-bills-v1', JSON.stringify(updated))
    }

    setBillDesc('')
    setBillAmount('')
    setShowAddBill(false)
    recordRum('bill_created', '/pay')
  }

  async function handleMarkBillPaid(id: string) {
    try {
      await api.bills.markPaid(id)
    } catch {
      // fallback
    }
    const updated = bills.map((b) => (b.id === id ? { ...b, status: 'paid' as const } : b))
    setBills(updated)
    localStorage.setItem('fairshare-bills-v1', JSON.stringify(updated))
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault()
    const amountMinor = Math.round(parseFloat(requestAmount || '0') * 100)
    if (!requestDesc.trim() || amountMinor <= 0) return

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + parseInt(requestExpiryDays || '7', 10))

    const newReq: MoneyRequest = {
      id: crypto.randomUUID(),
      fromUserId: 'u-you',
      toUserId: requestRecipient || 'friend',
      description: requestDesc.trim(),
      currency: 'INR',
      amountMinor,
      expiresAt: expiryDate.toISOString(),
      status: 'open',
      createdAt: new Date().toISOString(),
    }

    try {
      const created = await api.requests.create(newReq)
      setRequests([created, ...requests])
    } catch {
      const updated = [newReq, ...requests]
      setRequests(updated)
      localStorage.setItem('fairshare-requests-v1', JSON.stringify(updated))
    }

    setRequestDesc('')
    setRequestAmount('')
    setShowAddRequest(false)
    recordRum('money_request_created', '/pay')
  }

  async function handleSettleRequest(id: string) {
    try {
      await api.requests.settle(id)
    } catch {
      // fallback
    }
    const updated = requests.map((r) => (r.id === id ? { ...r, status: 'settled' as const } : r))
    setRequests(updated)
    localStorage.setItem('fairshare-requests-v1', JSON.stringify(updated))
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    setContactError('')
    setContactNotice('')
    const name = contactName.trim()
    const msisdn = normalizeMsisdn(contactMsisdn)
    if (name.length < 2) return setContactError('Enter the contact’s name.')
    if (!isValidMsisdn(msisdn)) return setContactError('Enter a valid phone number with country code.')

    const newContact: Contact = {
      id: crypto.randomUUID(),
      name,
      msisdn,
      addedAt: new Date().toISOString(),
      isRegisteredUser: false,
    }

    let saved = newContact
    try {
      saved = await api.contacts.add({ name, msisdn })
    } catch {
      // Keep a usable phone-only contact when the API is temporarily unavailable.
    }

    const updated = mergeContacts(contacts, [saved])
    setContacts(updated)
    saveLocalContacts(updated)
    setContactNotice(saved.isRegisteredUser
      ? `${saved.name} already uses Fairshare. You can add them directly to a split.`
      : `${saved.name} is saved as a phone contact and can receive WhatsApp reminders.`)

    setContactName('')
    setContactMsisdn('')
    setShowAddContact(false)
    recordRum('contact_added', '/pay')
  }

  function openWhatsApp(msisdn: string, name: string) {
    const cleanPhone = msisdn.replace(/[^\d]/g, '')
    const text = encodeURIComponent(`Hi ${name}! Friendly reminder regarding our Fairshare expenses.`)
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')
  }

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content">
        <section className="page-hero">
          <div>
            <span className="page-hero__icon"><HandCoins size={24} /></span>
            <div>
              <span className="eyebrow">Money & Commitments Hub</span>
              <h1>Upcoming Bills & Money Requests</h1>
              <p>Track due bills with automated recurring reminders, request money with expiration deadlines, and connect with contacts.</p>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="activity-toolbar" style={{ marginTop: '1rem' }}>
          <div className="segmented-control compact-tabs">
            <button className={activeTab === 'bills' ? 'is-active' : ''} onClick={() => setActiveTab('bills')}>
              <Calendar size={15} style={{ marginRight: 6 }} /> Upcoming Bills ({bills.filter((b) => b.status !== 'paid').length})
            </button>
            <button className={activeTab === 'requests' ? 'is-active' : ''} onClick={() => setActiveTab('requests')}>
              <Clock size={15} style={{ marginRight: 6 }} /> Money Requests ({requests.filter((r) => r.status === 'open').length})
            </button>
            <button className={activeTab === 'contacts' ? 'is-active' : ''} onClick={() => setActiveTab('contacts')}>
              <Users size={15} style={{ marginRight: 6 }} /> Phone Contacts ({contacts.length})
            </button>
          </div>
        </div>

        {loading && <p className="eyebrow" role="status" style={{ marginTop: '1rem' }}>Refreshing your money hub…</p>}

        {/* TAB 1: UPCOMING BILLS */}
        {activeTab === 'bills' && (
          <section style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Scheduled & Recurring Bills</h2>
              <button className="button button--primary" onClick={() => setShowAddBill(!showAddBill)}>
                <Plus size={16} /> Add upcoming bill
              </button>
            </div>

            {showAddBill && (
              <form onSubmit={handleCreateBill} style={{ background: 'var(--surface-elevated, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <h3>Schedule an upcoming payment</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Bill Description</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. WiFi Bill, Electricity"
                      value={billDesc}
                      onChange={(e) => setBillDesc(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="text-input"
                      placeholder="1499.00"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Recipient ID or phone</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Friend ID or +91 number"
                      value={requestRecipient}
                      onChange={(e) => setRequestRecipient(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Due Date</label>
                    <input
                      type="date"
                      className="text-input"
                      value={billDueDate}
                      onChange={(e) => setBillDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Recurrence</label>
                    <select
                      className="text-input"
                      value={billRecurrence}
                      onChange={(e) => setBillRecurrence(e.target.value as any)}
                    >
                      <option value="once">One-time</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className="button button--primary">Save Bill</button>
                  <button type="button" className="button button--ghost" onClick={() => setShowAddBill(false)}>Cancel</button>
                </div>
              </form>
            )}

            {bills.length === 0 ? (
              <div className="no-results">
                <Receipt size={28} />
                <strong>No upcoming bills tracked</strong>
                <span>Add regular monthly payments like rent, subscriptions, and utilities.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bills.map((bill) => {
                  const isOverdue = bill.status === 'overdue' || (bill.status === 'pending' && new Date(bill.dueDate) < new Date())
                  return (
                    <div
                      key={bill.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--surface-sunken, rgba(0,0,0,0.02))',
                        borderLeft: isOverdue ? '4px solid #ef4444' : bill.status === 'paid' ? '4px solid #10b981' : '4px solid #3b82f6',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '1.05rem', display: 'block' }}>{bill.description}</strong>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--ink-subtle)', marginTop: 4 }}>
                          <span>Due: {bill.dueDate}</span>
                          <span>·</span>
                          <span style={{ textTransform: 'capitalize' }}>{bill.recurrence}</span>
                          <span>·</span>
                          <span style={{ color: isOverdue ? '#ef4444' : bill.status === 'paid' ? '#10b981' : '#3b82f6', fontWeight: 600 }}>
                            {isOverdue ? 'Overdue' : bill.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <strong style={{ fontSize: '1.2rem' }}>{formatMoney(bill.amountMinor, 'INR')}</strong>
                        {bill.status !== 'paid' ? (
                          <button className="button button--secondary" onClick={() => handleMarkBillPaid(bill.id)}>
                            <Check size={16} /> Mark Paid
                          </button>
                        ) : (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={16} /> Paid
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: MONEY REQUESTS & DEFAULTER TRACKER */}
        {activeTab === 'requests' && (
          <section style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2>Money Requests with Expiration</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-subtle)' }}>
                  Active tickets close automatically once settled, or expire past the deadline for transparency.
                </p>
              </div>
              <button className="button button--primary" onClick={() => setShowAddRequest(!showAddRequest)}>
                <Plus size={16} /> Request money
              </button>
            </div>

            {showAddRequest && (
              <form onSubmit={handleCreateRequest} style={{ background: 'var(--surface-elevated, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <h3>Create a ticketed money request</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Reason / Description</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. Concert Ticket share"
                      value={requestDesc}
                      onChange={(e) => setRequestDesc(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="text-input"
                      placeholder="2500.00"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Expiration Window</label>
                    <select
                      className="text-input"
                      value={requestExpiryDays}
                      onChange={(e) => setRequestExpiryDays(e.target.value)}
                    >
                      <option value="1">24 Hours (Urgent)</option>
                      <option value="3">3 Days</option>
                      <option value="7">7 Days (Standard)</option>
                      <option value="14">14 Days</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className="button button--primary">Send Request Ticket</button>
                  <button type="button" className="button button--ghost" onClick={() => setShowAddRequest(false)}>Cancel</button>
                </div>
              </form>
            )}

            {requests.length === 0 ? (
              <div className="no-results">
                <Clock size={28} />
                <strong>No money requests created</strong>
                <span>Point defaulters transparently by requesting balances with an expiration ticket.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {requests.map((req) => {
                  const isExpired = req.status === 'expired' || (req.status === 'open' && new Date(req.expiresAt) < new Date())
                  return (
                    <div
                      key={req.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--surface-sunken, rgba(0,0,0,0.02))',
                        borderLeft: isExpired ? '4px solid #ef4444' : req.status === 'settled' ? '4px solid #10b981' : '4px solid #f59e0b',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '1.05rem', display: 'block' }}>{req.description}</strong>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--ink-subtle)', marginTop: 4 }}>
                          <span>Expires: {new Date(req.expiresAt).toLocaleDateString()}</span>
                          <span>·</span>
                          <span style={{ color: isExpired ? '#ef4444' : req.status === 'settled' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {isExpired ? 'Ticket Expired (Defaulter Notice)' : req.status === 'settled' ? 'Closed & Settled' : 'Ticket Open'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <strong style={{ fontSize: '1.2rem' }}>{formatMoney(req.amountMinor, 'INR')}</strong>
                        {req.status === 'open' && !isExpired ? (
                          <button className="button button--secondary" onClick={() => handleSettleRequest(req.id)}>
                            <Check size={16} /> Settle Ticket
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: CONTACTS & MSISDN PHONE DISCOVERY */}
        {activeTab === 'contacts' && (
          <section className="contacts-hub">
            <div className="contacts-hub__header">
              <div>
                <span className="eyebrow">People</span>
                <h2>Your Fairshare contacts</h2>
                <p>Add anyone by phone. We automatically check whether they already have a Fairshare account.</p>
              </div>
              <button className="button button--primary" onClick={() => setShowAddContact(!showAddContact)}>
                <UserPlus size={16} /> Add contact
              </button>
            </div>

            {showAddContact && (
              <form onSubmit={handleAddContact} className="contact-add-form">
                <div><span className="contact-add-form__icon"><UserPlus size={20} /></span><div><h3>Add by phone number</h3><p>Registered people will be linked; everyone else stays available as a phone contact.</p></div></div>
                <div className="contact-add-form__fields">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      type="text"
                      placeholder="e.g. Rohan Verma"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Phone number</span>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={contactMsisdn}
                      onChange={(e) => setContactMsisdn(e.target.value)}
                      required
                    />
                  </label>
                </div>
                {contactError && <p className="form-error" role="alert">{contactError}</p>}
                <div className="contact-add-form__actions">
                  <button type="submit" className="button button--primary">Save & check Fairshare</button>
                  <button type="button" className="button button--ghost" onClick={() => setShowAddContact(false)}>Cancel</button>
                </div>
              </form>
            )}

            {contactNotice && <p className="auth-alert auth-alert--success contact-notice" role="status"><Check size={15} /> {contactNotice}</p>}

            {contacts.length === 0 ? (
              <div className="no-results">
                <Phone size={28} />
                <strong>No contacts saved</strong>
                <span>Add friends by phone number to easily add them to group splits and send reminders.</span>
              </div>
            ) : (
              <div className="contact-card-grid">
                {contacts.map((c) => (
                  <article className="contact-card" key={c.id}>
                    <div className="contact-card__identity">
                      <span className="contact-card__avatar">{c.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                      <span><strong>{c.name}</strong><small>{c.msisdn}</small></span>
                      <i className={c.isRegisteredUser ? 'is-registered' : ''}>{c.isRegisteredUser ? <><BadgeCheck size={13} /> On Fairshare</> : <><Phone size={13} /> Phone contact</>}</i>
                    </div>
                    <p>{c.isRegisteredUser ? 'Ready for in-app splits and shared updates.' : 'Track their share here and remind them on WhatsApp.'}</p>
                    <div className="contact-card__actions">
                      <button className="button button--primary" onClick={() => onSplitWithContact(c)}><ReceiptText size={15} /> Split expense</button>
                      <button className="button button--secondary" onClick={() => openWhatsApp(c.msisdn, c.name)}>
                        <MessageCircle size={15} /> Chat
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
