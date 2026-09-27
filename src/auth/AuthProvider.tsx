import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthActionResult, AuthProfile, SocialProvider } from './types'
import { api, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api'

const DEMO_SESSION_KEY = 'fairshare-auth-demo-v1'
const DEMO_EMAIL = 'demo@fairshare.app'
const DEMO_PASSWORD = 'Fairshare123'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')

interface AuthContextValue {
  user: AuthProfile | null
  loading: boolean
  configured: boolean
  demoCredentials: { email: string; password: string }
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signUpWithEmail: (name: string, email: string, password: string) => Promise<AuthActionResult>
  signInWithSocial: (provider: SocialProvider) => Promise<AuthActionResult>
  sendPasswordReset: (email: string) => Promise<AuthActionResult>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<AuthProfile>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function parseJwtPayload(token: string): { sub?: string; email?: string; role?: string; exp?: number; iat?: number } | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function friendlyError(caught: unknown): Error {
  if (caught instanceof Error) return caught
  return new Error('Authentication could not be completed. Please try again.')
}

function loadDemoSession(): AuthProfile | null {
  try {
    const stored = localStorage.getItem(DEMO_SESSION_KEY)
    if (!stored) return null
    const profile = JSON.parse(stored) as AuthProfile
    if (profile.provider !== 'email') {
      localStorage.removeItem(DEMO_SESSION_KEY)
      return null
    }
    return profile
  } catch {
    return null
  }
}

function saveDemoSession(profile: AuthProfile | null) {
  if (profile) localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(profile))
  else localStorage.removeItem(DEMO_SESSION_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Fallback timer ensures loading resolves within 1.5s max
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 1500)

    const withTimeout = <T,>(promise: Promise<T>, ms = 1200): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), ms)),
      ])

    async function initSession() {
      try {
        // 1. Check if returning from OAuth redirect (URL contains tokens)
        const urlParams = new URLSearchParams(window.location.search)
        const accessToken = urlParams.get('access_token')
        const refreshToken = urlParams.get('refresh_token')
        const oauthError = urlParams.get('error')

        if (oauthError) {
          console.warn('OAuth callback returned error:', oauthError)
          window.history.replaceState({}, document.title, '/')
        }

        if (accessToken && refreshToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
          window.history.replaceState({}, document.title, '/')

          try {
            const profile = await withTimeout(api.users.getProfile())
            if (mounted) {
              setUser({
                id: profile.id,
                email: profile.email,
                name: profile.name,
                avatarUrl: profile.avatarUrl,
                phone: profile.phone,
                onboardingStep: profile.onboardingStep,
                provider: 'email',
                isDemo: false,
              })
              setLoading(false)
              return
            }
          } catch (e) {
            console.warn('Could not restore OAuth user profile from API', e)
          }
        }

        // 2. Check if existing Spring Boot API token exists
        const existingToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (existingToken) {
          try {
            const profile = await withTimeout(api.users.getProfile())
            if (mounted) {
              setUser({
                id: profile.id,
                email: profile.email,
                name: profile.name,
                avatarUrl: profile.avatarUrl,
                phone: profile.phone,
                onboardingStep: profile.onboardingStep,
                provider: 'email',
                isDemo: false,
              })
              setLoading(false)
              return
            }
          } catch {
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            localStorage.removeItem(REFRESH_TOKEN_KEY)
          }
        }

        // 3. Default to Demo session
        if (mounted) {
          setUser(loadDemoSession())
          setLoading(false)
        }
      } catch (err) {
        console.warn('Session init error:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void initSession()

    return () => {
      clearTimeout(fallbackTimer)
      mounted = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: Boolean(API_BASE_URL),
    demoCredentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD },

    async signInWithEmail(email, password) {
      try {
        // Attempt Spring Boot API login first
        try {
          const response = await api.auth.login({ email, password })
          localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
          localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
          const profile: AuthProfile = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            avatarUrl: response.user.avatarUrl,
            phone: response.user.phone,
            onboardingStep: response.user.onboardingStep,
            provider: 'email',
            isDemo: false,
          }
          saveDemoSession(null)
          setUser(profile)
          return {}
        } catch (apiErr) {
          // If api fails with 401 or network error and demo credentials are provided, fall back to demo
          if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
            const demoProfile: AuthProfile = {
              id: 'demo-email-user',
              email: DEMO_EMAIL,
              name: 'Riya Kapoor',
              provider: 'email',
              isDemo: true,
            }
            saveDemoSession(demoProfile)
            setUser(demoProfile)
            return {}
          }

          throw apiErr
        }
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signUpWithEmail(name, email, password) {
      try {
        // Attempt Spring Boot API registration first
        try {
          const response = await api.auth.register({ name, email, password })
          localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken)
          localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
          const profile: AuthProfile = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            avatarUrl: response.user.avatarUrl,
            phone: response.user.phone,
            onboardingStep: response.user.onboardingStep,
            provider: 'email',
            isDemo: false,
          }
          saveDemoSession(null)
          setUser(profile)
          return { message: 'Account created successfully.' }
        } catch (apiErr) {
          // Fallback demo signup
          const demoProfile: AuthProfile = {
            id: crypto.randomUUID(),
            email,
            name,
            provider: 'email',
            isDemo: true,
          }
          saveDemoSession(demoProfile)
          setUser(demoProfile)
          return { message: 'Demo account created locally on this device.' }
        }
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signInWithSocial(provider) {
      try {
        if (provider === 'google') {
          // Direct to Spring Boot Google OAuth endpoint
          window.location.href = `${API_BASE_URL}/auth/oauth/google`
          return {}
        }

        if (provider === 'github') {
          // Direct to Spring Boot GitHub OAuth endpoint
          window.location.href = `${API_BASE_URL}/auth/oauth/github`
          return {}
        }

        // Demo social fallback
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        const providerName = provider[0]?.toUpperCase() + provider.slice(1)
        const profile: AuthProfile = {
          id: `demo-${provider}-user`,
          email: `${provider}.demo@fairshare.app`,
          name: provider === 'apple' ? 'Apple User' : `${providerName} User`,
          provider,
          isDemo: true,
        }
        saveDemoSession(profile)
        setUser(profile)
        return {}
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async sendPasswordReset(email) {
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        return { message: 'If an account exists for that email, a reset link is on its way.' }
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signOut() {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        try {
          await api.auth.logout(refreshToken)
        } catch {
          // ignore error on logout
        }
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)

      saveDemoSession(null)
      setUser(null)
    },

    updateUser(updates: Partial<AuthProfile>) {
      setUser((prev) => {
        if (!prev) return null
        const next = { ...prev, ...updates }
        if (next.isDemo) {
          saveDemoSession(next)
        }
        return next
      })
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
