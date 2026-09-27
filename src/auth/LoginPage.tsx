import { useState } from 'react'
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  Check,
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

type AuthMode = 'signin' | 'reset'

interface LoginPageProps {
  notice?: string
  onCreateAccount: () => void
}

function GitHubMark({ size = 19 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.7 1.27 3.36.97.1-.75.4-1.27.73-1.56-2.57-.3-5.27-1.3-5.27-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.4-2.71 5.39-5.29 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  )
}

export function LoginPage({ notice = '', onCreateAccount }: LoginPageProps) {
  const { signInWithEmail, signInWithSocial, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(notice)

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
        const result = await sendPasswordReset(email.trim())
        setMessage(result.message ?? 'Reset instructions sent.')
        return
      }
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      setPending('email')
      await signInWithEmail(email.trim(), password)
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
              <button className="auth-back" type="button" onClick={() => switchMode('signin')}><ArrowLeft size={17} /> Back to sign in</button>
              <span className="auth-heading__icon"><LockKeyhole size={22} /></span>
              <h2>Reset your password</h2>
              <p>Enter the email attached to your account and we’ll send secure reset instructions.</p>
            </header>
          ) : (
            <header className="auth-heading">
              <span className="eyebrow">Welcome back</span>
              <h2>Sign in to Fairshare</h2>
              <p>Your groups and balances are waiting for you.</p>
            </header>
          )}

          {mode === 'signin' && (
            <>
              <div className="social-login-grid">
                <button type="button" disabled={busy} onClick={() => void social('google')}>
                  <span className="google-mark">G</span>
                  <strong>{pending === 'google' ? 'Connecting…' : 'Continue with Google'}</strong>
                </button>
                <button type="button" disabled={busy} onClick={() => void social('github')}>
                  <GitHubMark />
                  <strong>{pending === 'github' ? 'Connecting…' : 'Continue with GitHub'}</strong>
                </button>
              </div>
              <button className="github-login coming-soon-login" type="button" disabled aria-disabled="true" title="Apple sign-in is coming soon"><Apple size={19} fill="currentColor" /><span>Apple sign-in · Coming soon</span></button>
              <div className="auth-divider"><span>or continue with email</span></div>
            </>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="auth-field">
              <span>Email address</span>
              <div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            </label>

            {mode === 'signin' && (
              <label className="auth-field">
                <span>Password</span>
                <div><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              </label>
            )}

            {mode === 'signin' && (
              <div className="auth-options auth-options--end">
                <button type="button" onClick={() => switchMode('reset')}>Forgot password?</button>
              </div>
            )}

            {error && <p className="auth-alert auth-alert--error" role="alert">{error}</p>}
            {message && <p className="auth-alert auth-alert--success" role="status"><Check size={15} /> {message}</p>}

            <button className="auth-submit" type="submit" disabled={busy}>
              <span>{pending === 'email' || pending === 'reset' ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Send reset link'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {mode === 'signin' && <p className="auth-switch">New to Fairshare? <button type="button" onClick={onCreateAccount}>Create an account</button></p>}

          <footer className="auth-footer"><ShieldCheck size={14} /> Your credentials are transmitted securely and never stored by Fairshare.</footer>
        </div>
      </section>
    </main>
  )
}
