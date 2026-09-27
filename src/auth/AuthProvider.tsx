import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthActionResult, AuthProfile, SocialProvider } from './types'
import { api, ApiError, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')
const OAUTH_PROVIDER_KEY = 'fairshare-oauth-provider'

interface AuthContextValue {
  user: AuthProfile | null
  loading: boolean
  oauthError: string | null
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [oauthError, setOauthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fallbackTimer = window.setTimeout(() => {
      if (mounted) setLoading(false)
    }, 8000)

    const withTimeout = <T,>(promise: Promise<T>, ms = 8000): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Authentication check timed out.')), ms)),
      ])

    async function initSession() {
      try {
        const params = new URLSearchParams(window.location.search)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const errorParam = params.get('error')
        const pendingProvider = localStorage.getItem(OAUTH_PROVIDER_KEY)
        const provider = pendingProvider === 'github' || pendingProvider === 'google' ? pendingProvider : 'email'

        if (errorParam) {
          localStorage.removeItem(OAUTH_PROVIDER_KEY)
          window.history.replaceState({}, document.title, '/')
          if (mounted) {
            setOauthError(errorParam)
          }
          return
        }

        if (accessToken && refreshToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
          localStorage.removeItem(OAUTH_PROVIDER_KEY)
          window.history.replaceState({}, document.title, '/')
          try {
            const profile = await withTimeout(api.users.getProfile(), 8000)
            if (mounted) {
              setUser(profileFromApi(profile, provider))
              setLoading(false)
            }
            return
          } catch (e) {
            console.warn('Could not fetch user profile with new tokens', e)
          }
        }

        const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (storedToken) {
          try {
            const profile = await withTimeout(api.users.getProfile(), 8000)
            if (mounted) {
              setUser(profileFromApi(profile))
            }
          } catch (err) {
            console.warn('Could not restore the authentication session from storage.', err)
            // Only remove stored tokens if server explicitly rejected with 401 Unauthorized
            if (err instanceof ApiError && err.status === 401) {
              localStorage.removeItem(ACCESS_TOKEN_KEY)
              localStorage.removeItem(REFRESH_TOKEN_KEY)
            }
          }
        }
      } catch (caught) {
        console.warn('Could not restore the authentication session.', caught)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void initSession()
    return () => {
      mounted = false
      window.clearTimeout(fallbackTimer)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    oauthError,
    clearOAuthError() {
      setOauthError(null)
    },

    async signInWithEmail(email, password) {
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
      if (provider !== 'google' && provider !== 'github') {
        throw new Error('Apple sign-in is coming soon.')
      }
      localStorage.setItem(OAUTH_PROVIDER_KEY, provider)
      window.location.href = `${API_BASE_URL}/auth/oauth/${provider}`
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
      setUser(null)
    },

    updateUser(updates) {
      setUser((current) => current ? { ...current, ...updates } : null)
    },
  }), [loading, user, oauthError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
