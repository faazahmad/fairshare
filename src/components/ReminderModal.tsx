import { useEffect, useMemo, useState } from 'react'
import { AtSign, Check, Copy, ExternalLink, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import type { Debt, Group, User } from '../domain/types'
import { formatMoney } from '../domain/money'

type Tone = 'gentle' | 'direct' | 'playful'

interface ReminderModalProps {
  debt: Debt | null
  group?: Group
  currentUser?: User
  targetUser?: User
  onClose: () => void
}

export function ReminderModal({ debt, group, currentUser, targetUser, onClose }: ReminderModalProps) {
  const [tone, setTone] = useState<Tone>('gentle')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!debt) return
    setTone('gentle')
    setPhone(targetUser?.phone ?? '')
    setStatus('')
  }, [debt, targetUser])

  const message = useMemo(() => {
    if (!debt || !group || !currentUser || !targetUser) return ''
    const amount = formatMoney(debt.amount, 'INR')
    if (tone === 'direct') return `Hi ${targetUser.name.split(' ')[0]}, this is a reminder that ${amount} is outstanding in our “${group.name}” group on Fairshare. Please settle it when you can. — ${currentUser.name.split(' ')[0]}`
    if (tone === 'playful') return `Hey ${targetUser.name.split(' ')[0]} 👋 Fairshare says ${amount} from “${group.name}” is still on a little holiday 😄 Send it home when you get a chance! — ${currentUser.name.split(' ')[0]}`
    return `Hey ${targetUser.name.split(' ')[0]}, just a friendly reminder about the ${amount} balance from “${group.name}” on Fairshare. No rush—please settle it whenever convenient. Thanks! — ${currentUser.name.split(' ')[0]}`
  }, [debt, group, currentUser, targetUser, tone])

  if (!debt || !group || !currentUser || !targetUser) return null

  async function copyMessage() {
    await navigator.clipboard.writeText(message)
    setStatus('Reminder copied to your clipboard.')
  }

  function openWhatsApp() {
    const digits = phone.replace(/\D/g, '')
    const path = digits ? `${digits}?text=${encodeURIComponent(message)}` : `?text=${encodeURIComponent(message)}`
    window.open(`https://wa.me/${path}`, '_blank', 'noopener,noreferrer')
    setStatus(digits ? 'WhatsApp opened with a prefilled message.' : 'WhatsApp opened—choose the contact and tap send.')
  }

  async function openInstagram() {
    await copyMessage()
    if (navigator.share) {
      try {
        await navigator.share({ title: `Fairshare reminder for ${group!.name}`, text: message })
        setStatus('Share sheet opened. Choose Instagram to send the reminder.')
        return
      } catch {
        // A cancelled share falls back to the inbox with the message still copied.
      }
    }
    window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer')
    setStatus('Reminder copied and Instagram inbox opened. Paste it into the chat.')
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal reminder-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header"><div><span className="eyebrow"><Sparkles size={12} /> Smart reminder</span><h2 id="reminder-title">Nudge {targetUser.name.split(' ')[0]}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="reminder-balance"><span>{group.emoji}</span><div><small>Outstanding in {group.name}</small><strong>{formatMoney(debt.amount, 'INR')}</strong></div></div>
        <label className="field"><span>Reminder tone</span><div className="segmented-control reminder-tones">{(['gentle', 'direct', 'playful'] as Tone[]).map((value) => <button type="button" className={tone === value ? 'is-active' : ''} onClick={() => setTone(value)} key={value}>{value[0]?.toUpperCase()}{value.slice(1)}</button>)}</div></label>
        <label className="field"><span>WhatsApp number <small>optional, with country code</small></span><input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 919876543210" /></label>
        <label className="field"><span>Prepared message</span><textarea rows={5} value={message} readOnly /></label>
        <div className="reminder-actions"><button className="button button--secondary" onClick={() => void copyMessage()}><Copy size={16} /> Copy</button><button className="button whatsapp-button" onClick={openWhatsApp}><MessageCircle size={16} /> WhatsApp <ExternalLink size={13} /></button><button className="button instagram-button" onClick={() => void openInstagram()}><AtSign size={16} /> Instagram <Send size={13} /></button></div>
        <p className="helper-copy">Fairshare prepares the reminder; you review and tap send in the chosen app. Instagram’s public API cannot silently send arbitrary personal DMs.</p>
        {status && <p className="auth-alert auth-alert--success" role="status"><Check size={14} /> {status}</p>}
      </section>
    </div>
  )
}
