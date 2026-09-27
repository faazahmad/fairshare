import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
  WalletCards,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from './AuthProvider'

type CreateAccountStep = 'details' | 'phone' | 'otp'

const defaultCountry = { code: '+91', flag: '🇮🇳', name: 'India' }

const countryCodes = [
  defaultCountry,
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
]

interface CreateAccountFlowProps {
  onBack: () => void
  onComplete: (message?: string) => void
}

export function CreateAccountFlow({ onBack, onComplete }: CreateAccountFlowProps) {
  const { signUpWithEmail } = useAuth()
  const [step, setStep] = useState<CreateAccountStep>('details')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [countryCode, setCountryCode] = useState('+91')
  const [countryMenuOpen, setCountryMenuOpen] = useState(false)
  const countryPickerRef = useRef<HTMLDivElement | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [resendCooldown, setResendCooldown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) {
      if (resendCooldown === 0) setCanResend(true)
      return
    }
    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          setCanResend(true)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, resendCooldown])

  useEffect(() => {
    function closeCountryMenu(event: PointerEvent) {
      if (!countryPickerRef.current?.contains(event.target as Node)) setCountryMenuOpen(false)
    }
    function closeCountryMenuWithKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') setCountryMenuOpen(false)
    }
    window.addEventListener('pointerdown', closeCountryMenu)
    window.addEventListener('keydown', closeCountryMenuWithKeyboard)
    return () => {
      window.removeEventListener('pointerdown', closeCountryMenu)
      window.removeEventListener('keydown', closeCountryMenuWithKeyboard)
    }
  }, [])

  const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`
  const selectedCountry = countryCodes.find((country) => country.code === countryCode) ?? defaultCountry

  function submitDetails(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (firstName.trim().length < 2) {
      setError('Enter your first name.')
      return
    }
    if (lastName.trim().length < 2) {
      setError('Enter your last name.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!acceptedTerms) {
      setError('Accept the terms and privacy policy to continue.')
      return
    }
    setStep('phone')
  }

  async function submitPhone(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Enter a valid mobile number.')
      return
    }

    setPending(true)
    try {
      await api.auth.sendOtp(fullPhone)
      setMessage(`Verification code sent to ${fullPhone}.`)
      setStep('otp')
      setResendCooldown(30)
      setCanResend(false)
      window.setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The verification code could not be sent. Please try again.')
    } finally {
      setPending(false)
    }
  }

  function changeOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtpDigits((current) => current.map((entry, position) => position === index ? digit : entry))
    if (digit && index < 5) otpInputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  function pasteOtp(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    setOtpDigits(Array.from({ length: 6 }, (_, index) => pasted[index] ?? ''))
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function resendOtp() {
    if (!canResend || pending) return
    setPending(true)
    setError('')
    try {
      await api.auth.sendOtp(fullPhone)
      setMessage(`A new code was sent to ${fullPhone}.`)
      setResendCooldown(30)
      setCanResend(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'A new verification code could not be sent. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function finishRegistration(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const code = otpDigits.join('')
    if (code.length !== 6) {
      setError('Enter the complete 6-digit verification code.')
      return
    }

    setPending(true)
    try {
      await api.auth.verifyOtp(fullPhone, code)

      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const result = await signUpWithEmail(fullName, email.trim(), password, fullPhone)
      onComplete(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Account creation failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const stepNumber = step === 'details' ? 1 : step === 'phone' ? 2 : 3
  const stepName = step === 'details' ? 'Your details' : step === 'phone' ? 'Phone number' : 'Verification'

  return (
    <main className="onboarding-viewport">
      <div className="onboarding-container">
        <header className="onboarding-header">
          <div className="onboarding-brand">
            <span><WalletCards size={22} /></span>
            <strong>fairshare</strong>
          </div>
          <div className="onboarding-steps" aria-label="Account creation progress">
            <span className={`step-dot ${step === 'details' ? 'is-active' : 'is-done'}`} />
            <span className="step-connector" />
            <span className={`step-dot ${step === 'phone' ? 'is-active' : step === 'otp' ? 'is-done' : ''}`} />
            <span className="step-connector" />
            <span className={`step-dot ${step === 'otp' ? 'is-active' : ''}`} />
          </div>
          <span className="onboarding-step-label">Step {stepNumber} of 3: {stepName}</span>
        </header>

        {step === 'details' && (
          <section className="onboarding-card">
            <button className="auth-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to sign in</button>
            <div className="onboarding-hero">
              <span className="onboarding-icon-badge"><User size={26} /></span>
              <h2>Create your account</h2>
              <p>Tell us who you are and choose the credentials you’ll use to sign in.</p>
            </div>
            <form className="onboarding-form" onSubmit={submitDetails} noValidate>
              <div className="auth-name-grid">
                <label className="auth-field">
                  <span>First name</span>
                  <div><User size={17} /><input autoFocus autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" /></div>
                </label>
                <label className="auth-field">
                  <span>Last name</span>
                  <div><User size={17} /><input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" /></div>
                </label>
              </div>
              <label className="auth-field">
                <span>Email address</span>
                <div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
              </label>
              <label className="auth-field">
                <span>Password</span>
                <div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              </label>
              <label className="auth-field">
                <span>Confirm password</span>
                <div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></div>
              </label>
              <label className="auth-terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span><Check size={12} /></span><p>I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</p></label>
              {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit"><span>Continue</span><ArrowRight size={18} /></button>
            </form>
          </section>
        )}

        {step === 'phone' && (
          <section className="onboarding-card">
            <button className="auth-back" type="button" onClick={() => { setStep('details'); setError(''); setMessage('') }}><ArrowLeft size={17} /> Back to your details</button>
            <div className="onboarding-hero">
              <span className="onboarding-icon-badge"><Phone size={26} /></span>
              <h2>Add your phone number</h2>
              <p>We use it to verify your account, find friends, and secure payment reminders.</p>
            </div>
            <form className="onboarding-form" onSubmit={submitPhone}>
              <label className="auth-field">
                <span>Mobile number</span>
                <div className="phone-input-row">
                  <div className="country-picker" ref={countryPickerRef}>
                    <button
                      className="country-picker__trigger"
                      type="button"
                      aria-expanded={countryMenuOpen}
                      aria-controls="country-code-menu"
                      onClick={() => setCountryMenuOpen((open) => !open)}
                    >
                      <span className="country-picker__flag">{selectedCountry.flag}</span>
                      <strong>{selectedCountry.code}</strong>
                      <ChevronDown size={15} className={countryMenuOpen ? 'is-open' : ''} />
                    </button>
                    {countryMenuOpen && (
                      <div className="country-picker__menu" id="country-code-menu" role="listbox" aria-label="Choose country code">
                        <span className="country-picker__label">Country code</span>
                        {countryCodes.map((country) => (
                          <button
                            className={`country-picker__option ${country.code === countryCode ? 'is-selected' : ''}`}
                            type="button"
                            role="option"
                            aria-selected={country.code === countryCode}
                            key={country.name}
                            onClick={() => {
                              setCountryCode(country.code)
                              setCountryMenuOpen(false)
                            }}
                          >
                            <span>{country.flag}</span>
                            <span><strong>{country.name}</strong><small>{country.code}</small></span>
                            {country.code === countryCode && <Check size={15} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input aria-label="Mobile number" autoFocus type="tel" autoComplete="tel-national" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="98765 43210" maxLength={14} />
                </div>
              </label>
              {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
              {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} /> {message}</p>}
              <button className="auth-submit" type="submit" disabled={pending}><span>{pending ? 'Sending code…' : 'Send verification code'}</span><ArrowRight size={18} /></button>
            </form>
          </section>
        )}

        {step === 'otp' && (
          <section className="onboarding-card">
            <button className="auth-back" type="button" onClick={() => { setStep('phone'); setError(''); setMessage('') }}><ArrowLeft size={17} /> Change phone number</button>
            <div className="onboarding-hero">
              <span className="onboarding-icon-badge"><KeyRound size={26} /></span>
              <h2>Verify your number</h2>
              <p>Enter the 6-digit code sent to <strong>{fullPhone}</strong>.</p>
            </div>
            <form className="onboarding-form" onSubmit={finishRegistration}>
              <div className="otp-boxes-wrap" onPaste={pasteOtp}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { otpInputRefs.current[index] = element }}
                    className={`otp-box ${digit ? 'is-filled' : ''}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => changeOtp(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
              {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
              {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} /> {message}</p>}
              <div className="otp-resend-row">
                {canResend ? <button className="text-link" type="button" onClick={() => void resendOtp()} disabled={pending}>Resend verification code</button> : <span>Resend code in {resendCooldown}s</span>}
              </div>
              <button className="auth-submit" type="submit" disabled={pending || otpDigits.join('').length < 6}><span>{pending ? 'Creating account…' : 'Verify & create account'}</span><CheckCircle2 size={18} /></button>
            </form>
          </section>
        )}

        <footer className="onboarding-footer"><ShieldCheck size={15} /><span>Your details are protected and used only to secure your Fairshare account.</span></footer>
      </div>
    </main>
  )
}
