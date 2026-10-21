import { useEffect, useMemo, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Phone, ReceiptText, ShieldCheck, Sparkles, Users, WalletCards } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { digitsOnly, INDIA_COUNTRY, PHONE_COUNTRIES, toE164 } from './phoneAuth'
import type { SocialProvider } from './types'

type LoginView = 'options' | 'phone' | 'otp'

interface LoginPageProps {
  nativeExperience?: boolean
  notice?: string
  initialError?: string
  onCreateAccount: (phone?: string) => void
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.25-.2-1.8H12v3.4h5.52a4.71 4.71 0 0 1-2.05 3.1v2.2h3.32c1.94-1.78 3.06-4.41 3.06-7.53l-.25.63Z" />
      <path fill="#34A853" d="M12 22c2.77 0 5.09-.91 6.79-2.47l-3.32-2.6c-.91.62-2.08.99-3.47.99-2.67 0-4.94-1.81-5.75-4.24H2.82v2.28A10.26 10.26 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.25 13.68A6.2 6.2 0 0 1 5.92 12c0-.58.1-1.15.32-1.68V8.04H2.82A10.02 10.02 0 0 0 1.75 12c0 1.44.38 2.79 1.07 3.96l3.43-2.28Z" />
      <path fill="#EA4335" d="M12 6.08c1.51 0 2.87.52 3.94 1.55l2.92-2.92C17.08 3.04 14.77 2 12 2a10.26 10.26 0 0 0-9.18 6.04l3.43 2.28C7.06 7.89 9.33 6.08 12 6.08Z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M17.05 12.54c-.03-3.12 2.55-4.64 2.67-4.71a5.72 5.72 0 0 0-4.5-2.43c-1.89-.2-3.73 1.14-4.69 1.14-1 0-2.5-1.12-4.12-1.08a5.97 5.97 0 0 0-5.03 3.06c-2.18 3.77-.55 9.32 1.53 12.37 1.04 1.49 2.25 3.15 3.87 3.09 1.58-.07 2.17-.99 4.08-.99 1.89 0 2.44.99 4.09.95 1.7-.03 2.77-1.5 3.77-3 1.2-1.71 1.68-3.4 1.7-3.49-.04-.01-3.34-1.27-3.37-4.91ZM13.98 3.39A5.5 5.5 0 0 0 15.24-.56a5.61 5.61 0 0 0-3.63 1.88 5.24 5.24 0 0 0-1.3 3.8 4.64 4.64 0 0 0 3.67-1.73Z" />
    </svg>
  )
}

export function LoginPage({ nativeExperience = false, notice = '', initialError = '', onCreateAccount }: LoginPageProps) {
  const { authError, clearAuthError, requestPhoneOtp, signInWithSocial, verifyPhoneOtp } = useAuth()
  const [view, setView] = useState<LoginView>('options')
  const [countryIso, setCountryIso] = useState('IN')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState(initialError)
  const [message, setMessage] = useState(notice)
  const country = useMemo(() => PHONE_COUNTRIES.find((entry) => entry.iso === countryIso) ?? INDIA_COUNTRY, [countryIso])
  const fullPhone = useMemo(() => `${country.dialCode}${phone}`, [country, phone])

  useEffect(() => { if (initialError) setError(initialError) }, [initialError])
  useEffect(() => { if (authError) { setError(authError); setPending(null) } }, [authError])
  useEffect(() => {
    let handle: { remove: () => void } | null = null
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) window.setTimeout(() => setPending(null), 700)
      }).then((listener) => { handle = listener })
    }
    return () => { if (handle) void handle.remove() }
  }, [])

  function resetFeedback() {
    clearAuthError()
    setError('')
    setMessage('')
  }

  async function social(provider: SocialProvider) {
    resetFeedback()
    setPending(provider)
    try { await signInWithSocial(provider) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Sign-in could not be started.'); setPending(null) }
  }

  async function sendCode(event?: { preventDefault(): void }) {
    event?.preventDefault()
    resetFeedback()
    try {
      const e164 = toE164(country, phone)
      setPending('phone')
      const result = await requestPhoneOtp(e164, 'SIGN_IN')
      setView('otp')
      setMessage(result.devCode ? `Development code: ${result.devCode}` : `We sent a six-digit code to ${result.phone}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not send the code.')
    } finally { setPending(null) }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    resetFeedback()
    if (otp.length !== 6) { setError('Enter the complete six-digit code.'); return }
    try {
      setPending('otp')
      const result = await verifyPhoneOtp(fullPhone, otp, 'SIGN_IN')
      if (result.registrationRequired) {
        setError('There is no Fairshare account for this number yet.')
        setMessage('Create an account to verify your details and start sharing.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That code could not be verified.')
    } finally { setPending(null) }
  }

  const busy = pending !== null

  return (
    <main className={`auth-page${nativeExperience ? ' auth-page--native' : ''}`}>
      <section className="auth-story" aria-label="Fairshare product preview">
        <div className="auth-brand"><span><WalletCards size={24} /></span><strong>fairshare</strong></div>
        <div className="auth-story__copy">
          <span className="auth-kicker"><Sparkles size={14} /> Shared money, made simple</span>
          <h1>Spend together.<br />Stay friends.</h1>
          <p>Track trips, rent, dinners, and everything in between—without awkward spreadsheets or mental maths.</p>
        </div>
        <div className="auth-preview-card">
          <header><span>🌴</span><div><strong>Goa getaway</strong><small>4 friends · 12 expenses</small></div><i>Settling soon</i></header>
          <div className="auth-preview-card__balance"><small>Your balance</small><strong>₹10,108.33</strong><span>you get back</span></div>
          <div className="auth-preview-card__people"><span><i className="preview-avatar violet">MS</i><b>Maya owes you</b></span><strong>₹3,025</strong></div>
          <div className="auth-preview-card__people"><span><i className="preview-avatar green">KM</i><b>Kabir owes you</b></span><strong>₹3,692</strong></div>
        </div>
        <div className="auth-trust-row"><span><ShieldCheck size={16} /> Secure sessions</span><span><Users size={16} /> Built for groups</span><span><ReceiptText size={16} /> Clear audit trail</span></div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap auth-entry">
          <div className="auth-mobile-brand"><span><WalletCards size={20} /></span><strong>fairshare</strong></div>

          {view === 'options' && (
            <>
              <header className="auth-heading auth-entry__heading"><span className="eyebrow">Welcome to Fairshare</span><h2>One login. Everything shared.</h2><p>Choose a secure way to continue.</p></header>
              {(error || message) && <div className="auth-entry__feedback">{error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}{message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} />{message}</p>}</div>}
              <div className="auth-provider-stack">
                <button className="auth-provider-button auth-provider-button--google" type="button" disabled={busy} onClick={() => void social('google')}><GoogleMark /><span>{pending === 'google' ? 'Connecting…' : 'Continue with Google'}</span></button>
                <button className="auth-provider-button auth-provider-button--apple" type="button" disabled={busy} onClick={() => void social('apple')}><AppleMark /><span>{pending === 'apple' ? 'Connecting…' : 'Continue with Apple'}</span></button>
                <button className="auth-provider-button auth-provider-button--phone" type="button" disabled={busy} onClick={() => { resetFeedback(); setView('phone') }}><Phone size={19} /><span>Continue with mobile number</span><ArrowRight size={18} /></button>
              </div>
              <footer className="auth-footer"><ShieldCheck size={14} /> Secure authentication. Your password is never shared with Google or Apple.</footer>
            </>
          )}

          {view === 'phone' && (
            <>
              <header className="auth-heading auth-phone-heading"><button className="auth-back" type="button" onClick={() => { resetFeedback(); setView('options') }}><ArrowLeft size={17} /> All sign-in options</button><span className="auth-heading__icon"><Phone size={22} /></span><h2>Sign in with your mobile</h2><p>We’ll text you a one-time code. No password needed.</p></header>
              <form className="auth-form auth-phone-form" onSubmit={sendCode}>
                <label className="auth-field"><span>Mobile number</span><div className="phone-input-row">
                  <label className="auth-country-select"><span className="sr-only">Country</span><select value={countryIso} onChange={(event) => { setCountryIso(event.target.value); setPhone('') }} aria-label="Country code">{PHONE_COUNTRIES.map((entry) => <option key={entry.iso} value={entry.iso}>{entry.flag} {entry.dialCode}</option>)}</select><ChevronDown size={15} /></label>
                  <input autoFocus aria-label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder={country.iso === 'IN' ? '98765 43210' : 'Mobile number'} value={phone} maxLength={country.maxDigits} onChange={(event) => { setPhone(digitsOnly(event.target.value, country.maxDigits)); if (error) setError('') }} />
                </div></label>
                {country.iso === 'IN' && <p className="auth-field-hint">Indian mobile numbers are limited to 10 digits.</p>}
                {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
                <button className="auth-submit" type="submit" disabled={busy || phone.length < (country.exactDigits ?? 7)}><span>{pending === 'phone' ? 'Sending code…' : 'Send verification code'}</span><ArrowRight size={18} /></button>
              </form>
              <p className="auth-switch">New to Fairshare? <button type="button" onClick={() => onCreateAccount(phone ? fullPhone : undefined)}>Create an account</button></p>
            </>
          )}

          {view === 'otp' && (
            <>
              <header className="auth-heading auth-phone-heading"><button className="auth-back" type="button" onClick={() => { resetFeedback(); setOtp(''); setView('phone') }}><ArrowLeft size={17} /> Change mobile number</button><span className="auth-heading__icon"><ShieldCheck size={22} /></span><h2>Enter your code</h2><p>Six digits were sent to <strong>{fullPhone}</strong>.</p></header>
              <form className="auth-form auth-phone-form" onSubmit={verifyCode}>
                <label className="auth-field"><span>Verification code</span><div className="auth-otp-input"><input autoFocus aria-label="Six-digit verification code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="• • • • • •" value={otp} maxLength={6} onChange={(event) => { setOtp(digitsOnly(event.target.value, 6)); if (error) setError('') }} /></div></label>
                {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
                {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} />{message}</p>}
                <button className="auth-submit" type="submit" disabled={busy || otp.length !== 6}><span>{pending === 'otp' ? 'Verifying…' : 'Verify & sign in'}</span><ArrowRight size={18} /></button>
              </form>
              <div className="auth-otp-actions"><button type="button" onClick={() => void sendCode()}>Send a new code</button>{error.includes('no Fairshare account') && <button type="button" onClick={() => onCreateAccount(fullPhone)}>Create account</button>}</div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
