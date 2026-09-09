import { useEffect, useMemo, useState } from 'react'
import { AtSign, Check, Copy, ExternalLink, HandCoins, MessageCircle, Send, X } from 'lucide-react'
import type { Group, Payment, User } from '../domain/types'
import { formatMoney } from '../domain/money'

interface PaymentShareModalProps {
  payment: Payment | null
  group?: Group
  currentUser?: User
  targetUser?: User
  onClose: () => void
}

export function PaymentShareModal({ payment, group, currentUser, targetUser, onClose }: PaymentShareModalProps) {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!payment) return
    setPhone(targetUser?.phone ?? '')
    setStatus('')
  }, [payment, targetUser])

  const message = useMemo(() => {
    if (!payment || !group || !currentUser || !targetUser) return ''
    const amount = formatMoney(payment.amount, payment.currency)
    const firstName = targetUser.name.split(' ')[0]
    if (payment.fromUserId === currentUser.id) return `Hi ${firstName}, I recorded my ${amount} payment to you in our “${group.name}” group on Fairshare. Please check the update when convenient. — ${currentUser.name.split(' ')[0]}`
    if (payment.toUserId === currentUser.id) return `Hi ${firstName}, I recorded your ${amount} payment in our “${group.name}” group on Fairshare. Our balance has been updated. Thanks! — ${currentUser.name.split(' ')[0]}`
    return `Hi ${firstName}, a ${amount} payment has been recorded in the “${group.name}” group on Fairshare. Open the group to review the updated balance.`
  }, [payment, group, currentUser, targetUser])

  if (!payment || !group || !currentUser || !targetUser) return null

  async function copyMessage() {
    await navigator.clipboard.writeText(message)
    setStatus('Payment update copied to your clipboard.')
  }

  function openWhatsApp() {
    const digits = phone.replace(/\D/g, '')
    const path = digits ? `${digits}?text=${encodeURIComponent(message)}` : `?text=${encodeURIComponent(message)}`
    window.open(`https://wa.me/${path}`, '_blank', 'noopener,noreferrer')
    setStatus(digits ? 'WhatsApp opened with the payment update.' : 'WhatsApp opened—choose the contact and tap send.')
  }

  async function openInstagram() {
    await copyMessage()
    if (navigator.share) {
      try {
        await navigator.share({ title: `Fairshare payment update for ${group?.name ?? 'your group'}`, text: message })
        setStatus('Share sheet opened. Choose Instagram to send the update.')
        return
      } catch {
        // A cancelled share falls back to the inbox with the message copied.
      }
    }
    window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer')
    setStatus('Payment update copied and Instagram inbox opened. Paste it into the chat.')
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal reminder-modal payment-share-modal" role="dialog" aria-modal="true" aria-labelledby="payment-share-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow"><HandCoins size={12} /> Payment notification</span><h2 id="payment-share-title">Update {targetUser.name.split(' ')[0]}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="reminder-balance"><span>{group.emoji}</span><div><small>Payment recorded in {group.name}</small><strong>{formatMoney(payment.amount, payment.currency)}</strong></div></div>
        <label className="field"><span>WhatsApp number <small>optional, with country code</small></span><input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 919876543210" /></label>
        <label className="field"><span>Prepared update</span><textarea rows={5} value={message} readOnly /></label>
        <div className="reminder-actions"><button className="button button--secondary" type="button" onClick={() => void copyMessage()}><Copy size={16} /> Copy</button><button className="button whatsapp-button" type="button" onClick={openWhatsApp}><MessageCircle size={16} /> WhatsApp <ExternalLink size={13} /></button><button className="button instagram-button" type="button" onClick={() => void openInstagram()}><AtSign size={16} /> Instagram <Send size={13} /></button></div>
        <p className="helper-copy">Fairshare prepares the update; you review it and tap send in the chosen app. No message is sent silently.</p>
        {status && <p className="auth-alert auth-alert--success" role="status"><Check size={14} /> {status}</p>}
      </section>
    </div>
  )
}
