import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, Mail, PencilLine, Phone, ShieldCheck, UserRound, WalletCards } from 'lucide-react'
import { useAuth } from './AuthProvider'

export function ProfileReviewFlow() {
  const { user, completeOnboarding, resendEmailVerification, signOut } = useAuth()
  const inferredNames = (user?.name ?? '').trim().split(/\s+/)
  const [firstName, setFirstName] = useState(user?.firstName ?? inferredNames[0] ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? inferredNames.slice(1).join(' '))
  const [email, setEmail] = useState(user?.email ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function finish(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!firstName.trim() || !lastName.trim()) { setError('Please confirm your first and last name.'); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (!dateOfBirth || dateOfBirth >= new Date().toISOString().slice(0, 10)) { setError('Confirm a valid date of birth.'); return }
    if (!acceptedTerms) { setError('Please accept the Terms of Service and Privacy Policy to continue.'); return }
    try {
      setPending(true)
      await completeOnboarding({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), dateOfBirth, phone: user?.phone, acceptedTerms })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your profile could not be saved.')
    } finally { setPending(false) }
  }

  async function resendVerification() {
    setError('')
    setMessage('')
    try {
      setPending(true)
      await resendEmailVerification()
      setMessage('A new verification link was sent to your email.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The verification email could not be sent.')
    } finally { setPending(false) }
  }

  return (
    <main className="profile-review-page">
      <div className="profile-review-shell">
        <header className="profile-review-topbar"><div className="auth-mobile-brand"><span><WalletCards size={20} /></span><strong>fairshare</strong></div><button type="button" onClick={() => void signOut()}>Use another account</button></header>
        <section className="profile-review-intro"><span><PencilLine size={22} /></span><div><small>One last step</small><h1>Review your profile</h1><p>Make sure your details are right. This is how friends will recognise you across Fairshare.</p></div></section>
        <form className="profile-review-card" onSubmit={finish}>
          <div className="profile-review-person"><div className="profile-review-avatar">{(firstName[0] ?? 'F').toUpperCase()}{(lastName[0] ?? '').toUpperCase()}</div><div><strong>{[firstName, lastName].filter(Boolean).join(' ') || 'Your Fairshare profile'}</strong><span>{user?.provider === 'google' ? 'Connected with Google' : user?.provider === 'apple' ? 'Connected with Apple' : 'Phone number verified'}</span></div><Check size={18} /></div>
          <div className="auth-details-grid">
            <label className="auth-field"><span>First name</span><div><UserRound size={17} /><input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></div></label>
            <label className="auth-field"><span>Last name</span><div><UserRound size={17} /><input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} /></div></label>
          </div>
          <label className="auth-field"><span>Email address</span><div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
          <label className="auth-field"><span>Date of birth</span><div><CalendarDays size={17} /><input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></div></label>
          {user?.phone && <div className="profile-review-readonly"><Phone size={17} /><span><small>Verified mobile</small><strong>{user.phone}</strong></span><Check size={16} /></div>}
          {!user?.emailVerified && <div className="profile-review-email"><Mail size={17} /><span><strong>Email verification required</strong><small>We sent a verification link to {user?.email}. You can enter the app now and verify from your inbox.</small></span><button type="button" disabled={pending} onClick={() => void resendVerification()}>Resend</button></div>}
          <label className="auth-terms profile-review-terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span><Check size={13} /></span><p>I agree to Fairshare’s <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</p></label>
          {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
          {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} />{message}</p>}
          <button className="auth-submit profile-review-submit" type="submit" disabled={pending}><span>{pending ? 'Saving profile…' : 'Continue to Fairshare'}</span><ArrowRight size={18} /></button>
          <footer><ShieldCheck size={14} /> Your profile can be updated later from Settings.</footer>
        </form>
      </div>
    </main>
  )
}
