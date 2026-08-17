import {
  Bell, BellRing, Camera, Check, ChevronRight, EyeOff, FileKey2, Globe2, Group,
  ImagePlus, KeyRound, LayoutGrid, LockKeyhole, LogOut, Mail, Monitor, Moon,
  Palette, Save, ShieldCheck, Smartphone, Sun, Trash2, UserRound, WandSparkles,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import type {
  AccentPreference, AppPreferences, DensityPreference, NotificationPreferences,
  SecurityPreferences, ThemePreference, User,
} from '../domain/types'
import { Avatar } from '../components/Avatar'

export type SettingsSection = 'profile' | 'notifications' | 'appearance' | 'security'

interface SettingsPageProps {
  user: User
  activeSection: SettingsSection
  preferences: AppPreferences
  notifications: NotificationPreferences
  security: SecurityPreferences
  authProvider: string
  onSectionChange: (section: SettingsSection) => void
  onSaveProfile: (profile: Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'phone' | 'instagramHandle' | 'defaultCurrency' | 'language'>>) => void
  onUpdatePreferences: (patch: Partial<AppPreferences>) => void
  onUpdateNotifications: (patch: Partial<NotificationPreferences>) => void
  onUpdateSecurity: (patch: Partial<SecurityPreferences>) => void
  onResetPassword: () => Promise<string>
  onSignOut: () => void
  topbar: ReactNode
}

const sections: Array<{ id: SettingsSection; label: string; icon: typeof UserRound }> = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: ShieldCheck },
]

export function SettingsPage(props: SettingsPageProps) {
  const active = sections.find((section) => section.id === props.activeSection) ?? sections[0]!
  const ActiveIcon = active.icon

  return (
    <main className="main-panel page-panel" id="top">
      {props.topbar}
      <div className="content page-content settings-content">
        <section className="page-hero settings-hero">
          <div><span className="page-hero__icon"><ActiveIcon size={23} /></span><div><span className="eyebrow">Personal account</span><h1>{active.label}</h1><p>Manage your {active.label.toLowerCase()} preferences.</p></div></div>
        </section>

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections" role="tablist">
            {sections.map(({ id, label, icon: Icon }) => <button type="button" role="tab" aria-selected={props.activeSection === id} className={props.activeSection === id ? 'is-active' : ''} onClick={() => props.onSectionChange(id)} key={id}><Icon size={17} /><span>{label}</span><ChevronRight size={14} /></button>)}
          </nav>
          <div className="settings-sections">
            {props.activeSection === 'profile' && <ProfilePanel user={props.user} onSave={props.onSaveProfile} />}
            {props.activeSection === 'notifications' && <NotificationsPanel preferences={props.notifications} onUpdate={props.onUpdateNotifications} />}
            {props.activeSection === 'appearance' && <AppearancePanel preferences={props.preferences} onUpdate={props.onUpdatePreferences} />}
            {props.activeSection === 'security' && <SecurityPanel user={props.user} provider={props.authProvider} preferences={props.security} onUpdate={props.onUpdateSecurity} onResetPassword={props.onResetPassword} onSignOut={props.onSignOut} />}
          </div>
        </div>
      </div>
    </main>
  )
}

function ProfilePanel({ user, onSave }: { user: User; onSave: SettingsPageProps['onSaveProfile'] }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [instagramHandle, setInstagramHandle] = useState(user.instagramHandle ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '')
  const [currency, setCurrency] = useState(user.defaultCurrency ?? 'INR')
  const [language, setLanguage] = useState(user.language ?? 'en')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(user.name); setEmail(user.email); setPhone(user.phone ?? '')
    setInstagramHandle(user.instagramHandle ?? ''); setAvatarUrl(user.avatarUrl ?? '')
    setCurrency(user.defaultCurrency ?? 'INR'); setLanguage(user.language ?? 'en')
  }, [user])

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose a PNG, JPEG, or WebP image.'); return }
    if (file.size > 1_500_000) { setError('Profile pictures must be smaller than 1.5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result ?? ''))
    reader.onerror = () => setError('That photo could not be read. Please try another one.')
    reader.readAsDataURL(file)
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a name and a valid email address.'); return }
    onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), instagramHandle: instagramHandle.trim().replace(/^@/, ''), avatarUrl: avatarUrl || undefined, defaultCurrency: currency, language })
    setError(''); setFeedback('Profile saved on this device.')
    window.setTimeout(() => setFeedback(''), 2200)
  }

  return <form className="settings-panel" role="tabpanel" aria-label="Profile settings" onSubmit={save}>
    <section className="settings-card profile-photo-card"><header><div><h2>Profile picture</h2><p>Shown to friends in groups and settlements.</p></div><ImagePlus size={20} /></header><div className="profile-photo-editor"><Avatar user={{ ...user, name, email, avatarUrl: avatarUrl || undefined }} size="large" /><div><strong>{name || user.name}</strong><span>PNG, JPEG, or WebP · maximum 1.5 MB</span><div><button className="button button--secondary" type="button" onClick={() => fileInput.current?.click()}><Camera size={16} /> Choose photo</button>{avatarUrl && <button className="button button--ghost danger-text" type="button" onClick={() => setAvatarUrl('')}><Trash2 size={15} /> Remove</button>}</div></div><input ref={fileInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload profile picture" onChange={choosePhoto} /></div></section>
    <section className="settings-card"><header><div><h2>Personal details</h2><p>Used for receipts, reminders, and shared groups.</p></div><UserRound size={20} /></header><div className="form-grid"><label className="field"><span>Full name</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field"><span>Phone number</span><input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Used for WhatsApp reminders" /></label><label className="field"><span>Instagram username</span><input value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} placeholder="@username" /></label></div></section>
    <section className="settings-card"><header><div><h2>Regional preferences</h2><p>Applied to future expenses and app labels.</p></div><Globe2 size={20} /></header><div className="form-grid"><label className="field"><span>Default currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option></select></label><label className="field"><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="es">Español</option></select></label></div></section>
    {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}{feedback && <p className="auth-alert auth-alert--success" role="status"><Check size={14} /> {feedback}</p>}
    <button className="button button--primary settings-save" type="submit"><Save size={17} /> Save profile</button>
  </form>
}

function NotificationsPanel({ preferences, onUpdate }: { preferences: NotificationPreferences; onUpdate: (patch: Partial<NotificationPreferences>) => void }) {
  const [status, setStatus] = useState('')

  async function togglePush(enabled: boolean) {
    if (!enabled) { onUpdate({ pushEnabled: false }); setStatus('Push notifications paused.'); return }
    if (!('Notification' in window)) { setStatus('Push permission is unavailable in this preview. Native notifications will use the device permission screen.'); return }
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
      if (permission !== 'granted') { onUpdate({ pushEnabled: false }); setStatus('Notification permission was not granted. You can enable it later in device settings.'); return }
      onUpdate({ pushEnabled: true }); setStatus('Push notifications enabled.')
    } catch {
      onUpdate({ pushEnabled: false })
      setStatus('The device permission screen could not be opened. Try again from the installed app settings.')
    }
  }

  return <section className="settings-panel" role="tabpanel" aria-label="Notification settings">
    <section className="settings-card"><header><div><h2>Delivery</h2><p>Control how Fairshare reaches this device.</p></div><Smartphone size={20} /></header><ToggleRow icon={<BellRing size={17} />} title="Push notifications" copy="Request permission and show alerts on this device" checked={preferences.pushEnabled} onChange={(value) => void togglePush(value)} /><ToggleRow icon={<Mail size={17} />} title="Weekly email digest" copy="A weekly summary of open balances and spending" checked={preferences.weeklyDigest} onChange={(weeklyDigest) => onUpdate({ weeklyDigest })} /></section>
    <section className="settings-card"><header><div><h2>What you’re notified about</h2><p>These choices also filter the in-app notification centre.</p></div><Bell size={20} /></header><ToggleRow icon={<FileKey2 size={17} />} title="Expense updates" copy="New and edited expenses in your groups" checked={preferences.expenseUpdates} onChange={(expenseUpdates) => onUpdate({ expenseUpdates })} /><ToggleRow icon={<LockKeyhole size={17} />} title="Settlement reminders" copy="Outstanding balance nudges and payment updates" checked={preferences.settlementReminders} onChange={(settlementReminders) => onUpdate({ settlementReminders })} /><ToggleRow icon={<Group size={17} />} title="Group invitations" copy="Invitations and membership changes" checked={preferences.groupInvites} onChange={(groupInvites) => onUpdate({ groupInvites })} /></section>
    <section className="settings-card"><header><div><h2>Quiet hours</h2><p>Mute non-critical push alerts during a daily window.</p></div><Moon size={20} /></header><ToggleRow icon={<Moon size={17} />} title="Use quiet hours" copy="In-app updates remain available" checked={preferences.quietHoursEnabled} onChange={(quietHoursEnabled) => onUpdate({ quietHoursEnabled })} />{preferences.quietHoursEnabled && <div className="form-grid quiet-hours-fields"><label className="field"><span>From</span><input type="time" value={preferences.quietHoursStart} onChange={(event) => onUpdate({ quietHoursStart: event.target.value })} /></label><label className="field"><span>Until</span><input type="time" value={preferences.quietHoursEnd} onChange={(event) => onUpdate({ quietHoursEnd: event.target.value })} /></label></div>}</section>
    {status && <p className="settings-status" role="status">{status}</p>}
  </section>
}

function AppearancePanel({ preferences, onUpdate }: { preferences: AppPreferences; onUpdate: (patch: Partial<AppPreferences>) => void }) {
  return <section className="settings-panel" role="tabpanel" aria-label="Appearance settings">
    <section className="settings-card appearance-card"><header><div><h2>Make Fairshare yours</h2><p>Changes preview immediately and are saved on this device.</p></div><WandSparkles size={20} /></header><div className="appearance-block"><span>Theme</span><div className="theme-choice-grid">{([['light', Sun, 'Light'], ['dark', Moon, 'True black'], ['system', Monitor, 'System']] as const).map(([value, Icon, label]) => <button type="button" className={preferences.theme === value ? 'is-active' : ''} onClick={() => onUpdate({ theme: value as ThemePreference })} key={value}><Icon size={18} /><strong>{label}</strong><small>{value === 'system' ? 'Match device' : value === 'dark' ? 'OLED friendly' : 'Light canvas'}</small></button>)}</div></div><div className="appearance-split"><div className="appearance-block"><span>Theme colour</span><div className="accent-choices">{(['coral', 'emerald', 'violet'] as AccentPreference[]).map((accent) => <button type="button" aria-label={`${accent} accent`} className={`${accent} ${preferences.accent === accent ? 'is-active' : ''}`} onClick={() => onUpdate({ accent })} key={accent}><Check size={12} /></button>)}</div></div><div className="appearance-block"><span>Layout density</span><div className="density-choices">{(['comfortable', 'compact'] as DensityPreference[]).map((density) => <button type="button" className={preferences.density === density ? 'is-active' : ''} onClick={() => onUpdate({ density })} key={density}><LayoutGrid size={14} /> {density}</button>)}</div></div></div><ToggleRow icon={<EyeOff size={17} />} title="Privacy mode" copy="Blur financial amounts until you hover or tap" checked={preferences.hideBalances} onChange={(hideBalances) => onUpdate({ hideBalances })} /><ToggleRow icon={<WandSparkles size={17} />} title="Reduce motion" copy="Disable decorative animations and transitions" checked={preferences.reduceMotion} onChange={(reduceMotion) => onUpdate({ reduceMotion })} /></section>
  </section>
}

function SecurityPanel({ user, provider, preferences, onUpdate, onResetPassword, onSignOut }: { user: User; provider: string; preferences: SecurityPreferences; onUpdate: (patch: Partial<SecurityPreferences>) => void; onResetPassword: () => Promise<string>; onSignOut: () => void }) {
  const [status, setStatus] = useState('')
  const [working, setWorking] = useState(false)

  async function resetPassword() {
    setWorking(true)
    try { setStatus(await onResetPassword()) } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'The reset request could not be completed.') }
    finally { setWorking(false) }
  }

  return <section className="settings-panel" role="tabpanel" aria-label="Security settings">
    <section className="settings-card"><header><div><h2>Password and sign-in</h2><p>Signed in as {user.email} using {provider}.</p></div><KeyRound size={20} /></header><div className="security-action-row"><span><strong>Reset your password</strong><small>We’ll send recovery instructions to your account email.</small></span><button className="button button--secondary" type="button" disabled={working} onClick={() => void resetPassword()}>{working ? 'Sending…' : 'Send reset email'}</button></div><ToggleRow icon={<BellRing size={17} />} title="Login alerts" copy="Notify you when a new device signs in" checked={preferences.loginAlerts} onChange={(loginAlerts) => onUpdate({ loginAlerts })} /><ToggleRow icon={<ShieldCheck size={17} />} title="Confirm sensitive actions" copy="Always confirm deletions and other irreversible actions" checked={preferences.confirmSensitiveActions} onChange={(confirmSensitiveActions) => onUpdate({ confirmSensitiveActions })} /></section>
    <section className="settings-card"><header><div><h2>This device</h2><p>Your current Fairshare session.</p></div><Smartphone size={20} /></header><div className="device-session"><span><Smartphone size={18} /></span><div><strong>Current device</strong><small>Active now · protected by your account sign-in</small></div><i>Current</i></div><button className="button button--secondary danger-text" type="button" onClick={onSignOut}><LogOut size={17} /> Sign out on this device</button></section>
    <section className="settings-card security-note"><LockKeyhole size={21} /><div><strong>Native security roadmap</strong><p>Face ID, fingerprint unlock, encrypted token storage, and trusted-device management will be connected in the Android and iOS shells before store submission—not simulated in this browser preview.</p></div></section>
    {status && <p className="settings-status" role="status">{status}</p>}
  </section>
}

function ToggleRow({ icon, title, copy, checked, onChange }: { icon: ReactNode; title: string; copy: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-setting"><span className="toggle-setting__icon">{icon}</span><span><strong>{title}</strong><small>{copy}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>
}
