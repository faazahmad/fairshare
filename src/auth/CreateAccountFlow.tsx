import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, KeyRound, Mail, Phone, ShieldCheck, UserRound, WalletCards } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { digitsOnly, INDIA_COUNTRY, PHONE_COUNTRIES, toE164 } from './phoneAuth'

type SignUpStep = 'phone' | 'otp' | 'details'

interface CreateAccountFlowProps {
  initialPhone?: string
  onBack: () => void
  onComplete?: () => void
}

function initialPhoneParts(value?: string) {
  const match = PHONE_COUNTRIES.find((country) => value?.startsWith(country.dialCode))
  return { country: match ?? INDIA_COUNTRY, national: value && match ? value.slice(match.dialCode.length) : '' }
}

export function CreateAccountFlow({ initialPhone, onBack, onComplete }: CreateAccountFlowProps) {
  const { registerWithPhone, requestPhoneOtp, verifyPhoneOtp } = useAuth()
  const initial = useMemo(() => initialPhoneParts(initialPhone), [initialPhone])
  const [step, setStep] = useState<SignUpStep>('phone')
  const [countryIso, setCountryIso] = useState(initial.country.iso)
  const [phone, setPhone] = useState(digitsOnly(initial.national, initial.country.maxDigits))
  const [otp, setOtp] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const country = useMemo(() => PHONE_COUNTRIES.find((entry) => entry.iso === countryIso) ?? INDIA_COUNTRY, [countryIso])
  const fullPhone = useMemo(() => `${country.dialCode}${phone}`, [country, phone])

  function resetFeedback() { setError(''); setMessage('') }

  async function sendCode(event?: { preventDefault(): void }) {
    event?.preventDefault()
    resetFeedback()
    try {
      const e164 = toE164(country, phone)
      setPending(true)
      const result = await requestPhoneOtp(e164, 'SIGN_UP')
      setStep('otp')
      setMessage(result.devCode ? `Development code: ${result.devCode}` : `We sent a six-digit code to ${result.phone}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not send the code.')
    } finally { setPending(false) }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    resetFeedback()
    if (otp.length !== 6) { setError('Enter the complete six-digit code.'); return }
    try {
      setPending(true)
      const result = await verifyPhoneOtp(fullPhone, otp, 'SIGN_UP')
      if (!result.verificationToken) throw new Error('Phone verification expired. Request a new code.')
      setVerificationToken(result.verificationToken)
      setStep('details')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That code could not be verified.')
    } finally { setPending(false) }
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault()
    resetFeedback()
    if (!firstName.trim() || !lastName.trim()) { setError('Enter your first and last name.'); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (!dateOfBirth || dateOfBirth >= new Date().toISOString().slice(0, 10)) { setError('Enter a valid date of birth.'); return }
    if (password.length < 8) { setError('Use at least 8 characters for your recovery password.'); return }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return }
    try {
      setPending(true)
      await registerWithPhone({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), dateOfBirth, password, phone: fullPhone, phoneVerificationToken: verificationToken })
      onComplete?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your account could not be created.')
    } finally { setPending(false) }
  }

  const stepNumber = step === 'phone' ? 1 : step === 'otp' ? 2 : 3

  return (
    <main className="onboarding-page auth-signup-page">
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <button className="auth-brand auth-brand--dark" type="button" onClick={onBack} aria-label="Back to Fairshare sign in"><span><WalletCards size={21} /></span><strong>fairshare</strong></button>
          <div className="onboarding-steps" aria-label={`Step ${stepNumber} of 3`}><i className={`step-dot${stepNumber >= 1 ? ' is-done' : ''}`} /><i className={`step-dot${stepNumber >= 2 ? ' is-done' : ''}`} /><i className={`step-dot${stepNumber >= 3 ? ' is-done' : ''}`} /></div>
          <span className="onboarding-step-label">{stepNumber} / 3</span>
        </header>

        {step === 'phone' && (
          <section className="onboarding-card">
            <button className="auth-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to sign in</button>
            <div className="onboarding-hero"><span className="onboarding-icon-badge"><Phone size={25} /></span><h2>Create your account</h2><p>Start with your mobile number. We’ll verify it before collecting any profile details.</p></div>
            <form className="onboarding-form" onSubmit={sendCode}>
              <label className="auth-field"><span>Mobile number</span><div className="phone-input-row">
                <label className="auth-country-select"><span className="sr-only">Country</span><select value={countryIso} onChange={(event) => { setCountryIso(event.target.value as typeof countryIso); setPhone('') }} aria-label="Country code">{PHONE_COUNTRIES.map((entry) => <option key={entry.iso} value={entry.iso}>{entry.flag} {entry.dialCode}</option>)}</select><ChevronDown size={15} /></label>
                <input autoFocus aria-label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} maxLength={country.maxDigits} placeholder={country.iso === 'IN' ? '98765 43210' : 'Mobile number'} onChange={(event) => setPhone(digitsOnly(event.target.value, country.maxDigits))} />
              </div></label>
              {country.iso === 'IN' && <p className="auth-field-hint">Indian mobile numbers accept exactly 10 digits.</p>}
              {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={pending || phone.length < (country.exactDigits ?? 7)}><span>{pending ? 'Sending code…' : 'Continue'}</span><ArrowRight size={18} /></button>
            </form>
          </section>
        )}

        {step === 'otp' && (
          <section className="onboarding-card">
            <button className="auth-back" type="button" onClick={() => { resetFeedback(); setOtp(''); setStep('phone') }}><ArrowLeft size={17} /> Change mobile number</button>
            <div className="onboarding-hero"><span className="onboarding-icon-badge"><KeyRound size={25} /></span><h2>Verify your number</h2><p>Enter the code sent to <strong>{fullPhone}</strong>.</p></div>
            <form className="onboarding-form" onSubmit={verifyCode}>
              <label className="auth-field"><span>Six-digit code</span><div className="auth-otp-input"><input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} placeholder="• • • • • •" onChange={(event) => setOtp(digitsOnly(event.target.value, 6))} /></div></label>
              {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
              {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} />{message}</p>}
              <button className="auth-submit" type="submit" disabled={pending || otp.length !== 6}><span>{pending ? 'Verifying…' : 'Verify number'}</span><ArrowRight size={18} /></button>
              <button className="auth-secondary-action" type="button" disabled={pending} onClick={() => void sendCode()}>Send a new code</button>
            </form>
          </section>
        )}

        {step === 'details' && (
          <section className="onboarding-card onboarding-card--details">
            <button className="auth-back" type="button" onClick={() => { resetFeedback(); setStep('otp') }}><ArrowLeft size={17} /> Back to verification</button>
            <div className="onboarding-hero"><span className="onboarding-icon-badge"><UserRound size={25} /></span><h2>Tell us about you</h2><p>These details build your Fairshare profile. You’ll review everything once more before entering the app.</p></div>
            <form className="onboarding-form auth-details-form" onSubmit={createAccount}>
              <div className="auth-details-grid">
                <label className="auth-field"><span>First name</span><div><UserRound size={17} /><input autoFocus autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" /></div></label>
                <label className="auth-field"><span>Last name</span><div><UserRound size={17} /><input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" /></div></label>
              </div>
              <label className="auth-field"><span>Email address</span><div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
              <label className="auth-field"><span>Date of birth</span><div><CalendarDays size={17} /><input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></div></label>
              <label className="auth-field"><span>Recovery password</span><div><KeyRound size={17} /><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></div></label>
              <label className="auth-field"><span>Confirm password</span><div><KeyRound size={17} /><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></div></label>
              <p className="auth-field-hint"><Mail size={13} /> We’ll send a verification link to this email after account creation.</p>
              {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? 'Creating account…' : 'Review my profile'}</span><ArrowRight size={18} /></button>
            </form>
          </section>
        )}

        <footer className="onboarding-footer"><ShieldCheck size={15} /><span>Your details are encrypted in transit and used to protect your account.</span></footer>
      </div>
    </main>
  )
}
