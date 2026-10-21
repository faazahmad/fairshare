import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import type { User } from '../domain/types'
import { api, ApiError, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api'
import type { AuthActionResult, AuthProfile, AuthProviderAvailability, OtpDispatch, OtpPurpose, PhoneVerificationResult, SocialProvider } from './types'
import { parseNativeOAuthCallback } from './nativeOAuth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')
const OAUTH_PROVIDER_KEY = 'fairshare-oauth-provider'
const AUTH_CHECK_TIMEOUT_MS = 10_000
export const WELCOME_SESSION_KEY = 'fairshare-show-welcome'

interface RegistrationPayload {
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  password: string
  phone: string
  phoneVerificationToken: string
}

interface ReviewPayload {
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  phone?: string
  acceptedTerms: boolean
}

interface AuthContextValue {
  user: AuthProfile | null
  loading: boolean
  authError: string | null
  providers: AuthProviderAvailability
  oauthError: string | null
  clearAuthError: () => void
  clearOAuthError: () => void
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signInWithSocial: (provider: SocialProvider) => Promise<AuthActionResult>
  requestPhoneOtp: (phone: string, purpose: OtpPurpose) => Promise<OtpDispatch>
  verifyPhoneOtp: (phone: string, code: string, purpose: OtpPurpose) => Promise<PhoneVerificationResult>
  registerWithPhone: (payload: RegistrationPayload) => Promise<void>
  completeOnboarding: (payload: ReviewPayload) => Promise<void>
  resendEmailVerification: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<AuthActionResult>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<AuthProfile>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyError(caught: unknown): Error {
  if (caught instanceof Error) return caught
  return new Error('Authentication could not be completed. Please try again.')
}

function profileFromApi(profile: User, provider: AuthProfile['provider'] = 'email'): AuthProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    phoneVerified: profile.phoneVerified,
    emailVerified: profile.emailVerified,
    termsAccepted: profile.termsAccepted,
    profileReviewed: profile.profileReviewed,
    onboardingStep: profile.onboardingStep,
    provider,
    isDemo: false,
  }
}

function parametersFromUrl(url: string): URLSearchParams {
  const parsed = new URL(url, window.location.origin)
  const parameters = new URLSearchParams(parsed.search)
  const hashParameters = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  hashParameters.forEach((value, key) => parameters.set(key, value))
  return parameters
}

function callbackParameters(): URLSearchParams {
  return parametersFromUrl(window.location.href)
}

function pendingProvider(): AuthProfile['provider'] {
  const pending = localStorage.getItem(OAUTH_PROVIDER_KEY)
  return pending === 'google' || pending === 'apple' || pending === 'github' ? pending : 'email'
}

function clearCallbackUrl(): void {
  window.history.replaceState({}, document.title, '/')
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_CHECK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Authentication check timed out.')), timeoutMs)
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value) },
      (error: unknown) => { window.clearTimeout(timer); reject(error) },
    )
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [providers, setProviders] = useState<AuthProviderAvailability>({ phone: true, google: true, apple: true })

  useEffect(() => {
    let mounted = true
    let appUrlListener: PluginListenerHandle | null = null

    async function establishSession(accessToken: string, refreshToken: string, provider: AuthProfile['provider']) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.removeItem(OAUTH_PROVIDER_KEY)
      setAuthError(null)
      setLoading(true)
      try {
        const profile = await withTimeout(api.users.getProfile())
        if (mounted) setUser(profileFromApi(profile, provider))
      } catch (caught) {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        if (mounted) setAuthError(friendlyError(caught).message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    async function consumeCallback(parameters: URLSearchParams, clearWebUrl: boolean) {
      const accessToken = parameters.get('access_token')
      const refreshToken = parameters.get('refresh_token')
      const callbackError = parameters.get('error_description') ?? parameters.get('error')
      if (callbackError) {
        localStorage.removeItem(OAUTH_PROVIDER_KEY)
        if (clearWebUrl) clearCallbackUrl()
        throw new Error(decodeURIComponent(callbackError))
      }
      if (!accessToken || !refreshToken) throw new Error('The sign-in provider returned an incomplete session. Please try again.')
      if (clearWebUrl) clearCallbackUrl()
      await establishSession(accessToken, refreshToken, pendingProvider())
    }

    async function initSession() {
      const parameters = callbackParameters()
      const hasOAuthCallback = parameters.has('access_token') || parameters.has('refresh_token') || parameters.has('error') || parameters.has('error_description')
      try {
        if (hasOAuthCallback) {
          await consumeCallback(parameters, true)
          return
        }
        if (parameters.has('email_verified') || parameters.has('email_verification_error')) clearCallbackUrl()
        if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
          try {
            const profile = await withTimeout(api.users.getProfile())
            if (mounted) setUser(profileFromApi(profile))
          } catch (caught) {
            if (caught instanceof ApiError && caught.status === 401) {
              localStorage.removeItem(ACCESS_TOKEN_KEY)
              localStorage.removeItem(REFRESH_TOKEN_KEY)
            } else {
              throw caught
            }
          }
        }
      } catch (caught) {
        if (mounted) setAuthError(friendlyError(caught).message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url) return
        try {
          await Browser.close()
        } catch {
          // The provider sheet may already have closed itself.
        }
        try {
          const tokens = parseNativeOAuthCallback(url)
          if (tokens) await establishSession(tokens.accessToken, tokens.refreshToken, pendingProvider())
        } catch (caught) {
          if (mounted) setAuthError(friendlyError(caught).message)
        }
      }).then((listener) => { appUrlListener = listener })
    }

    void initSession()
    void api.auth.providers().then(setProviders).catch(() => {
      // Keep every option available if the capability check itself is temporarily unreachable.
    })
    return () => {
      mounted = false
      if (appUrlListener) void appUrlListener.remove()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    authError,
    providers,
    oauthError: authError,
    clearAuthError: () => setAuthError(null),
    clearOAuthError: () => setAuthError(null),

    async signInWithEmail(email, password) {
      setAuthError(null)
      try {
        const response = await api.auth.login({ email, password })
        localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
        setUser(profileFromApi(response.user))
        return {}
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signInWithSocial(provider) {
      setAuthError(null)
      if (provider === 'google' && !providers.google) throw new Error('Google sign-in is temporarily unavailable because its server credentials are not configured.')
      if (provider === 'apple' && !providers.apple) throw new Error('Apple sign-in is not configured yet. Add the Apple Services ID and signing key on the server, then try again.')
      localStorage.setItem(OAUTH_PROVIDER_KEY, provider)
      const native = Capacitor.isNativePlatform()
      const targetUrl = `${API_BASE_URL}/auth/oauth/${provider}${native ? '?platform=mobile' : ''}`
      if (native) await Browser.open({ url: targetUrl, windowName: '_self' })
      else window.location.assign(targetUrl)
      return {}
    },

    async requestPhoneOtp(phone, purpose) {
      setAuthError(null)
      try {
        return await api.auth.sendOtp(phone, purpose)
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async verifyPhoneOtp(phone, code, purpose) {
      setAuthError(null)
      try {
        const result = await api.auth.verifyOtp(phone, code, purpose)
        if (result.auth) {
          localStorage.setItem(ACCESS_TOKEN_KEY, result.auth.accessToken)
          localStorage.setItem(REFRESH_TOKEN_KEY, result.auth.refreshToken)
          localStorage.removeItem(OAUTH_PROVIDER_KEY)
          setUser(profileFromApi(result.auth.user))
        }
        return {
          verified: result.verified,
          registrationRequired: result.registrationRequired,
          phone: result.phone,
          verificationToken: result.verificationToken,
        }
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async registerWithPhone(payload) {
      setAuthError(null)
      try {
        const response = await api.auth.register(payload)
        localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
        setUser(profileFromApi(response.user))
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async completeOnboarding(payload) {
      setAuthError(null)
      try {
        const profile = await api.users.completeOnboarding(payload)
        sessionStorage.setItem(WELCOME_SESSION_KEY, '1')
        setUser(profileFromApi(profile, user?.provider ?? 'email'))
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async resendEmailVerification() {
      try {
        await api.users.resendEmailVerification()
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async sendPasswordReset() {
      return { message: 'Password recovery will be available after the secure reset endpoint is enabled.' }
    },

    async signOut() {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        try { await api.auth.logout(refreshToken) } catch { /* Always clear the local session. */ }
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(OAUTH_PROVIDER_KEY)
      sessionStorage.removeItem(WELCOME_SESSION_KEY)
      setAuthError(null)
      setUser(null)
    },

    updateUser(updates) {
      setUser((current) => current ? { ...current, ...updates } : null)
    },
  }), [authError, loading, providers, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
