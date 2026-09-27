import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from './supabase'
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

function mapSupabaseUser(user: SupabaseUser): AuthProfile {
  const metadata = user.user_metadata ?? {}
  const provider = user.app_metadata.provider
  return {
    id: user.id,
    email: user.email ?? '',
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Fairshare member',
    avatarUrl: metadata.avatar_url || metadata.picture,
    provider: provider === 'google' || provider === 'apple' || provider === 'github' ? provider : 'email',
    onboardingStep: 'done',
    isDemo: false,
  }
}

function friendlyError(caught: unknown): Error {
  if (caught instanceof Error) return caught
  return new Error('Authentication could not be completed. Please try again.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initSession() {
      // 1. Check if returning from Google OAuth redirect (URL contains tokens)
      const urlParams = new URLSearchParams(window.location.search)
      const accessToken = urlParams.get('access_token')
      const refreshToken = urlParams.get('refresh_token')

      if (accessToken && refreshToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
        window.history.replaceState({}, document.title, window.location.pathname)

        try {
          const profile = await api.users.getProfile()
          if (mounted) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              provider: 'google',
              isDemo: false,
            })
            setLoading(false)
            return
          }
        } catch (e) {
          console.warn('Could not restore Google OAuth user profile from API', e)
        }
      }

      // 2. Check if existing Spring Boot API token exists
      const existingToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      if (existingToken) {
        try {
          const profile = await api.users.getProfile()
          if (mounted) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
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

      // 3. Check Supabase if configured
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data.session?.user && mounted) {
            setUser(mapSupabaseUser(data.session.user))
            setLoading(false)
            return
          }
        } catch (error) {
          console.error('Could not restore Supabase session', error)
        }
      }

      // 4. Default to Demo session
      if (mounted) {
        setUser(loadDemoSession())
        setLoading(false)
      }
    }

    void initSession()

    return () => {
      clearTimeout(fallbackTimer)
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!supabase || !isNativeAuth()) return
    let removeListener: (() => Promise<void>) | undefined
    void listenForNativeOAuth().then((remove) => { removeListener = remove })
    return () => { void removeListener?.() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: isSupabaseConfigured || Boolean(import.meta.env.VITE_API_BASE_URL),
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

          if (supabase) {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
            return {}
          }

          throw apiErr
        }
      } catch (caught) {
        if (supabase) {
          try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
            return {}
          } catch {
            // fall through to throw original
          }
        }
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
            provider: 'email',
            isDemo: false,
          }
          saveDemoSession(null)
          setUser(profile)
          return { message: 'Account created successfully.' }
        } catch (apiErr) {
          if (supabase) {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: name },
                emailRedirectTo: getAuthRedirectUrl(),
              },
            })
            if (error) throw error
            return data.session ? {} : { message: 'Check your inbox to confirm your email, then sign in.' }
          }

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
          // Direct to Spring Boot Google OAuth endpoint if backend is targeted
          window.location.href = `${API_BASE_URL}/auth/oauth/google`
          return {}
        }

        if (supabase) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: getAuthRedirectUrl() },
          })
          if (error) throw error
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
        if (supabase) {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getAuthRedirectUrl(),
          })
          if (error) throw error
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 450))
        }
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

      if (supabase) {
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore
        }
      }

      saveDemoSession(null)
      setUser(null)
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
