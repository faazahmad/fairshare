import { useState } from 'react'
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import type { SocialProvider } from './types'

type AuthMode = 'signin' | 'signup' | 'reset'

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithSocial, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPending(null)
  }

  function validateEmail() {
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      validateEmail()
      if (mode === 'reset') {
        setPending('reset')
        const result = await sendPasswordReset(email)
        setMessage(result.message ?? 'Reset instructions sent.')
        return
      }
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      setPending('email')
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passwords do not match.')
        if (!acceptedTerms) throw new Error('Accept the terms and privacy policy to continue.')
        const fallbackName = email.trim().split('@')[0] || 'User'
        const result = await signUpWithEmail(fallbackName, email.trim(), password)
        if (result.message) setMessage(result.message)
      } else {
        await signInWithEmail(email.trim(), password)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
    } finally {
      setPending(null)
    }
  }

  async function social(provider: SocialProvider) {
    setError('')
    setMessage('')
    setPending(provider)
    try {
      await signInWithSocial(provider)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Social sign-in could not be started.')
      setPending(null)
    }
  }

  const busy = pending !== null

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Fairshare product preview">
        <button className="auth-brand" aria-label="Fairshare">
          <span><WalletCards size={24} /></span>
          <strong>fairshare</strong>
        </button>

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

        <div className="auth-trust-row">
          <span><ShieldCheck size={16} /> Secure sessions</span>
          <span><Users size={16} /> Built for groups</span>
          <span><ReceiptText size={16} /> Clear audit trail</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span><WalletCards size={20} /></span><strong>fairshare</strong></div>

          {mode === 'reset' ? (
            <header className="auth-heading">
              <button className="auth-back" onClick={() => switchMode('signin')}><ArrowLeft size={17} /> Back to sign in</button>
              <span className="auth-heading__icon"><LockKeyhole size={22} /></span>
              <h2>Reset your password</h2>
              <p>Enter the email attached to your account and we’ll send secure reset instructions.</p>
            </header>
          ) : (
            <header className="auth-heading">
              <span className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</span>
              <h2>{mode === 'signin' ? 'Sign in to Fairshare' : 'Start sharing expenses'}</h2>
              <p>{mode === 'signin' ? 'Your groups and balances are waiting for you.' : 'Set up your free account in less than a minute.'}</p>
            </header>
          )}

          {mode !== 'reset' && (
            <>
              <div className="social-login-grid">
                <button disabled={busy} onClick={() => void social('google')}>
                  <span className="google-mark">G</span>
                  <strong>{pending === 'google' ? 'Connecting…' : 'Continue with Google'}</strong>
                </button>
                <button disabled={busy} onClick={() => void social('apple')}>
                  <Apple size={19} fill="currentColor" />
                  <strong>{pending === 'apple' ? 'Connecting…' : 'Continue with Apple'}</strong>
                </button>
              </div>
              <button className="github-login" disabled={busy} onClick={() => void social('github')}><Code2 size={18} /><span>{pending === 'github' ? 'Connecting to GitHub…' : 'Continue with GitHub'}</span></button>
              <div className="auth-divider"><span>or continue with email</span></div>
            </>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="auth-field">
              <span>Email address</span>
              <div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            </label>

            {mode !== 'reset' && (
              <label className="auth-field">
                <span>Password</span>
                <div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              </label>
            )}

            {mode === 'signup' && (
              <label className="auth-field">
                <span>Confirm password</span>
                <div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></div>
              </label>
            )}

            {mode === 'signin' && (
              <div className="auth-options auth-options--end">
                <button type="button" onClick={() => switchMode('reset')}>Forgot password?</button>
              </div>
            )}

            {mode === 'signup' && (
              <label className="auth-terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span><Check size={12} /></span><p>I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>.</p></label>
            )}

            {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
            {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} /> {message}</p>}

            <button className="auth-submit" type="submit" disabled={busy}>
              <span>{pending === 'email' || pending === 'reset' ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : mode === 'signup' ? 'Create my account' : 'Send reset link'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {mode !== 'reset' && <p className="auth-switch">{mode === 'signin' ? 'New to Fairshare?' : 'Already have an account?'} <button onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>}

          <footer className="auth-footer"><ShieldCheck size={14} /> Your credentials are transmitted securely and never stored by Fairshare.</footer>
        </div>
      </section>
    </main>
  )
}
