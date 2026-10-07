import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import {
  Apple,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Globe,
  KeyRound,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import type { SocialProvider } from './types'

type AuthMode = 'signin' | 'reset'

interface LoginPageProps {
  nativeExperience?: boolean
  notice?: string
  initialError?: string
  onCreateAccount: () => void
}

function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

function GitHubMark({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export function LoginPage({
  nativeExperience = false,
  notice = '',
  initialError = '',
  onCreateAccount,
}: LoginPageProps) {
  const { authError, clearAuthError, signInWithEmail, signInWithSocial, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState(initialError)
  const [message, setMessage] = useState(notice)

  useEffect(() => {
    if (initialError) {
      setError(initialError)
      setPending(null)
    }
  }, [initialError])

  useEffect(() => {
    if (authError) {
      setError(authError)
      setPending(null)
    }
  }, [authError])

  useEffect(() => {
    let handle: { remove: () => void } | null = null
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          window.setTimeout(() => setPending(null), 1000)
        }
      }).then((l) => {
        handle = l
      })
    }
    return () => {
      if (handle) void handle.remove()
    }
  }, [])

  function switchMode(nextMode: AuthMode) {
    clearAuthError()
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    if (error) setError('')
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    if (error) setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    clearAuthError()
    setError('')
    setMessage('')
    try {
      if (mode === 'signin') {
        setPending('email')
        await signInWithEmail(email, password)
      } else {
        setPending('reset')
        const result = await sendPasswordReset(email)
        setMessage(result.message ?? 'Password reset instructions sent.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
    } finally {
      setPending(null)
    }
  }

  async function social(provider: SocialProvider) {
    clearAuthError()
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
    <main className={`auth-page${nativeExperience ? ' auth-page--native' : ''}`}>
      <section className="auth-story" aria-label="Fairshare product preview">
        <button className="auth-brand" aria-label="Fairshare">
          <span><WalletCards size={24} /></span>
          <strong>fairshare</strong>
        </button>

        <div className="auth-story__lead">
          <span className="eyebrow">Shared living made simple</span>
          <h2>Split without the friction.</h2>
          <p>Equal, percentage, exact shares, and direct splits with live balance settlement.</p>
        </div>

        <div className="auth-preview-card">
          <header><span>🔑</span><div><strong>September rent</strong><small>3 housemates · 4 shared bills</small></div><i>Due in 3 days</i></header>
          <div className="auth-preview-card__balance"><small>Your balance</small><strong>₹8,750.00</strong><span>you get back</span></div>
          <div className="auth-preview-card__people"><span><i className="preview-avatar violet">AV</i><b>Aanya owes you</b></span><strong>₹5,500</strong></div>
          <div className="auth-preview-card__people"><span><i className="preview-avatar green">RN</i><b>Rohan owes you</b></span><strong>₹3,250</strong></div>
        </div>

        <div className="auth-trust-row">
          <div><Users size={16} /><span>Direct & group splits</span></div>
          <div><Globe size={16} /><span>Multi-currency</span></div>
          <div><ShieldCheck size={16} /><span>Secure sessions</span></div>
          <div><Smartphone size={16} /><span>Mobile-first</span></div>
        </div>
      </section>

      <section className="auth-card-wrapper">
        <div className="auth-card">
          <header className="auth-card__header">
            {mode === 'reset' && (
              <button
                type="button"
                className="auth-back-button"
                onClick={() => switchMode('signin')}
                disabled={busy}
              >
                <ArrowLeft size={16} />
                <span>Back to sign in</span>
              </button>
            )}

            <h2>
              {mode === 'signin' && 'Welcome back'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p>
              {mode === 'signin' && 'Sign in to access your groups, shared balances, and activity.'}
              {mode === 'reset' && 'Enter your email address and we will help you recover access.'}
            </p>
          </header>

          {message && <div className="auth-status-pill info">{message}</div>}
          {error && <div className="auth-status-pill error">{error}</div>}

          {mode === 'signin' && (
            <>
              <div className="auth-social-buttons">
                <button
                  type="button"
                  className="auth-social-button auth-social-button--google"
                  onClick={() => void social('google')}
                  disabled={busy}
                >
                  <GoogleMark />
                  <span>{pending === 'google' ? 'Redirecting…' : 'Continue with Google'}</span>
                </button>
                <button
                  type="button"
                  className="auth-social-button auth-social-button--github"
                  onClick={() => void social('github')}
                  disabled={busy}
                >
                  <GitHubMark />
                  <span>{pending === 'github' ? 'Redirecting…' : 'Continue with GitHub'}</span>
                </button>
                <button
                  type="button"
                  className="auth-social-button auth-social-button--apple"
                  onClick={() => void social('apple')}
                  disabled={busy}
                >
                  <Apple size={18} />
                  <span>{pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}</span>
                </button>
              </div>

              <div className="auth-divider">
                <span>or continue with email</span>
              </div>
            </>
          )}

          <form className="auth-form" onSubmit={(e) => void submit(e)}>
            <label className="field">
              <span>Email address</span>
              <div className="field-input-wrapper">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  disabled={busy}
                />
              </div>
            </label>

            {mode === 'signin' && (
              <label className="field">
                <span className="field-label-row">
                  <span>Password</span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => switchMode('reset')}
                    disabled={busy}
                  >
                    Forgot password?
                  </button>
                </span>
                <div className="field-input-wrapper">
                  <KeyRound size={16} className="field-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            )}

            <button
              type="submit"
              className="button button--primary auth-submit"
              disabled={busy}
            >
              <span>
                {mode === 'signin' && (pending === 'email' ? 'Signing in…' : 'Sign in')}
                {mode === 'reset' && (pending === 'reset' ? 'Sending reset link…' : 'Send reset link')}
              </span>
              <ChevronRight size={17} />
            </button>
          </form>

          {mode === 'signin' && (
            <footer className="auth-card__footer">
              <span>Do not have an account?</span>
              <button
                type="button"
                className="link-button strong"
                onClick={onCreateAccount}
                disabled={busy}
              >
                Create an account
              </button>
            </footer>
          )}
        </div>
      </section>
    </main>
  )
}
