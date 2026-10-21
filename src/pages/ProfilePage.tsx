import { AtSign, BellRing, CheckCircle2, Globe2, Home, Landmark, Pencil, Phone, QrCode, ShieldCheck, UserRound, WalletCards } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar } from '../components/Avatar'
import { ChannelLogo } from '../components/ChannelLogo'
import type { User } from '../domain/types'
import { ProfilePanel, type ProfileSaveHandler } from './SettingsPage'

interface ProfilePageProps {
  user: User
  onHome: () => void
  onOpenSettings: () => void
  onSave: ProfileSaveHandler
  topbar: ReactNode
}

export function ProfilePage({ user, onHome, onOpenSettings, onSave, topbar }: ProfilePageProps) {
  const [editing, setEditing] = useState(false)

  async function save(profile: Parameters<ProfileSaveHandler>[0]) {
    await onSave(profile)
    setEditing(false)
  }

  return (
    <main className="main-panel page-panel" id="top">
      {topbar}
      <div className="content page-content profile-page">
        <section className="page-hero profile-hero">
          <div><span className="page-hero__icon"><UserRound size={23} /></span><div><span className="eyebrow">Personal account</span><h1>{editing ? 'Edit profile' : 'Your profile'}</h1><p>{editing ? 'Update the details people see when they share expenses with you.' : 'This is how you appear to friends, groups, and Fairshare contacts.'}</p></div></div>
          <button className="button button--secondary" type="button" onClick={onHome}><Home size={17} /> Home</button>
        </section>

        {editing ? (
          <div className="profile-edit-shell">
            <div className="profile-edit-shell__bar"><div><strong>Editing your profile</strong><span>Your changes are saved when you select Save profile.</span></div><button className="button button--ghost" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
            <ProfilePanel user={user} onSave={save} />
          </div>
        ) : (
          <div className="profile-overview">
            <section className="profile-showcase">
              <div className="profile-showcase__glow" />
              <Avatar user={user} size="large" />
              <span className="profile-showcase__status">Fairshare member</span>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <button className="button button--primary" type="button" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button>
            </section>

            <div className="profile-overview__details">
              <section className="settings-card profile-detail-card">
                <header><div><h2>About you</h2><p>Details used for groups, receipts, and reminders.</p></div><UserRound size={20} /></header>
                <dl>
                  <div><dt><AtSign size={16} /> Email</dt><dd>{user.email}</dd></div>
                  <div><dt><Phone size={16} /> Phone</dt><dd>{user.phone || 'Not added yet'}</dd></div>
                  <div><dt><ChannelLogo channel="instagram" size={16} /> Instagram</dt><dd>{user.instagramHandle ? `@${user.instagramHandle}` : 'Not connected'}</dd></div>
                  <div><dt><Globe2 size={16} /> Language</dt><dd>{user.language === 'hi' ? 'हिन्दी' : user.language === 'es' ? 'Español' : 'English'}</dd></div>
                  <div><dt><WalletCards size={16} /> Currency</dt><dd>{user.defaultCurrency || 'INR'}</dd></div>
                </dl>
              </section>

              <section className="settings-card profile-detail-card payment-readiness-card">
                <header><div><h2>Payment methods</h2><p>Only the method selected for a request is shared with its payer.</p></div><Landmark size={20} /></header>
                <dl>
                  <div><dt><AtSign size={16} /> UPI</dt><dd>{user.upiId || 'Not configured'}</dd></div>
                  <div><dt><Landmark size={16} /> Bank transfer</dt><dd>{user.bankAccountNumber ? `Ready · ending ${user.bankAccountNumber.slice(-4)}` : 'Not configured'}</dd></div>
                  <div><dt><QrCode size={16} /> Payment QR</dt><dd>{user.paymentQrData ? <><CheckCircle2 size={14} /> Ready</> : 'Not configured'}</dd></div>
                </dl>
              </section>

              <button className="profile-settings-link" type="button" onClick={onOpenSettings}>
                <span><ShieldCheck size={20} /></span>
                <span><strong>Account settings</strong><small>Manage alerts, appearance, and security.</small></span>
                <BellRing size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
