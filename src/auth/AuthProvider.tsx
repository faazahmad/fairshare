import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import type { AuthActionResult, AuthProfile, SocialProvider } from './types'
import { api, ApiError, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')
const OAUTH_PROVIDER_KEY = 'fairshare-oauth-provider'
const AUTH_CHECK_TIMEOUT_MS = 10_000

interface AuthContextValue {
  user: AuthProfile | null
  loading: boolean
  authError: string | null
  oauthError: string | null
  clearAuthError: () => void
  clearOAuthError: () => void
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signUpWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<AuthActionResult>
  signInWithSocial: (provider: SocialProvider) => Promise<AuthActionResult>
  sendPasswordReset: (email: string) => Promise<AuthActionResult>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<AuthProfile>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyError(caught: unknown): Error {
  if (caught instanceof Error) return caught
  return new Error('Authentication could not be completed. Please try again.')
}

function profileFromApi(
  profile: { id: string; email: string; name: string; avatarUrl?: string; phone?: string; onboardingStep?: string },
  provider: AuthProfile['provider'] = 'email',
): AuthProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    onboardingStep: profile.onboardingStep,
    provider,
    isDemo: false,
  }
}

function callbackParameters(): URLSearchParams {
  const parameters = new URLSearchParams(window.location.search)
  const hashParameters = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  hashParameters.forEach((value, key) => parameters.set(key, value))
  return parameters
}

function clearCallbackUrl(): void {
  window.history.replaceState({}, document.title, '/')
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_CHECK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Authentication check timed out.')), timeoutMs)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const initialParameters = callbackParameters()
    const expectsSession =
      initialParameters.has('access_token') ||
      initialParameters.has('refresh_token') ||
      initialParameters.has('error') ||
      initialParameters.has('error_description') ||
      Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))

    const fallbackTimer = window.setTimeout(() => {
      if (!mounted) return
      if (expectsSession) {
        setAuthError('Sign-in took too long. Check that the backend is running, then try again.')
      }
      setLoading(false)
    }, AUTH_CHECK_TIMEOUT_MS + 1_000)

    async function handleAuthTokens(accessToken: string, refreshToken: string, provider: AuthProfile['provider']) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.removeItem(OAUTH_PROVIDER_KEY)
      clearCallbackUrl()
      try {
        const profile = await withTimeout(api.users.getProfile())
        if (mounted) {
          setUser(profileFromApi(profile, provider))
          setLoading(false)
        }
      } catch (e) {
        console.warn('Could not fetch user profile with new tokens', e)
        if (mounted) {
          setAuthError('Failed to fetch user profile with new tokens.')
          setLoading(false)
        }
      }
    }

    async function initSession() {
      const parameters = callbackParameters()
      const accessToken = parameters.get('access_token')
      const refreshToken = parameters.get('refresh_token')
      const oauthError = parameters.get('error_description') ?? parameters.get('error')
      const hasCallback =
        parameters.has('access_token') ||
        parameters.has('refresh_token') ||
        parameters.has('error') ||
        parameters.has('error_description')
      const pendingProvider = localStorage.getItem(OAUTH_PROVIDER_KEY)
      const provider = pendingProvider === 'github' || pendingProvider === 'google' ? pendingProvider : 'email'

      try {
        if (oauthError) {
          localStorage.removeItem(OAUTH_PROVIDER_KEY)
          clearCallbackUrl()
          throw new Error(decodeURIComponent(oauthError))
        }

        if (hasCallback && (!accessToken || !refreshToken)) {
          clearCallbackUrl()
          throw new Error('The sign-in provider returned an incomplete session. Please try again.')
        }

        if (accessToken && refreshToken) {
          await handleAuthTokens(accessToken, refreshToken, provider)
          return
        }

        const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (storedToken) {
          try {
            const profile = await withTimeout(api.users.getProfile())
            if (mounted) setUser(profileFromApi(profile))
          } catch (error) {
            console.warn('Could not restore the authentication session from storage.', error)
            if (error instanceof ApiError && error.status === 401) {
              localStorage.removeItem(ACCESS_TOKEN_KEY)
              localStorage.removeItem(REFRESH_TOKEN_KEY)
            }
          }
        }
      } catch (caught) {
        console.warn('Could not restore the authentication session.', caught)
        if (mounted) setAuthError(friendlyError(caught).message)
      } finally {
        window.clearTimeout(fallbackTimer)
        if (mounted) setLoading(false)
      }
    }

    let appUrlListener: PluginListenerHandle | null = null

    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appUrlOpen', async (data) => {
        try {
          await Browser.close()
        } catch {
          // Browser may already be closed
        }

        if (data.url && (data.url.includes('auth/callback') || data.url.includes('access_token'))) {
          try {
            const parsedUrl = new URL(data.url)
            const accessToken = parsedUrl.searchParams.get('access_token')
            const refreshToken = parsedUrl.searchParams.get('refresh_token')
            const errorParam = parsedUrl.searchParams.get('error_description') ?? parsedUrl.searchParams.get('error')
            const pendingProvider = localStorage.getItem(OAUTH_PROVIDER_KEY)
            const provider = pendingProvider === 'github' || pendingProvider === 'google' ? pendingProvider : 'email'

            if (errorParam) {
              localStorage.removeItem(OAUTH_PROVIDER_KEY)
              if (mounted) {
                setAuthError(decodeURIComponent(errorParam))
              }
              return
            }

            if (accessToken && refreshToken) {
              await handleAuthTokens(accessToken, refreshToken, provider)
            }
          } catch (err) {
            console.warn('Could not handle native auth redirect deep link', err)
            if (mounted) {
              setAuthError('Failed to process mobile login.')
            }
          }
        }
      }).then((listener) => {
        appUrlListener = listener
      })
    }

    void initSession()
    return () => {
      mounted = false
      window.clearTimeout(fallbackTimer)
      if (appUrlListener) {
        void appUrlListener.remove()
      }
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    authError,
    oauthError: authError,
    clearAuthError() {
      setAuthError(null)
    },
    clearOAuthError() {
      setAuthError(null)
    },

    async signInWithEmail(email, password) {
      setAuthError(null)
      try {
        const response = await api.auth.login({ email, password })
        localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
        localStorage.removeItem(OAUTH_PROVIDER_KEY)
        setUser(profileFromApi(response.user))
        return {}
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signUpWithEmail(name, email, password, phone) {
      setAuthError(null)
      try {
        const response = await api.auth.register({ name, email, password, phone })
        localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
        localStorage.removeItem(OAUTH_PROVIDER_KEY)
        setUser(profileFromApi({
          ...response.user,
          phone: response.user.phone ?? phone,
        }))
        return { message: 'Account created successfully.' }
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signInWithSocial(provider) {
      setAuthError(null)
      if (provider !== 'google' && provider !== 'github') {
        throw new Error('Apple sign-in is coming soon.')
      }
      localStorage.setItem(OAUTH_PROVIDER_KEY, provider)
      const isNative = Capacitor.isNativePlatform()
      const targetUrl = `${API_BASE_URL}/auth/oauth/${provider}${isNative ? '?platform=mobile' : ''}`
      if (isNative) {
        await Browser.open({ url: targetUrl, windowName: '_self' })
      } else {
        window.location.assign(targetUrl)
      }
      return {}
    },

    async sendPasswordReset() {
      return { message: 'Password recovery will be available after the backend reset endpoint is enabled.' }
    },

    async signOut() {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        try {
          await api.auth.logout(refreshToken)
        } catch {
          // Clear the local session even if the backend is unavailable.
        }
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(OAUTH_PROVIDER_KEY)
      setAuthError(null)
      setUser(null)
    },

    updateUser(updates) {
      setUser((current) => current ? { ...current, ...updates } : null)
    },
  }), [authError, loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
