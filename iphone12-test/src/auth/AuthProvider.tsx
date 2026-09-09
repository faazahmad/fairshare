import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from './supabase'
import type { AuthActionResult, AuthProfile, SocialProvider } from './types'
import { isNativeAuth, listenForNativeOAuth, startNativeOAuth } from './nativeOAuth'

const DEMO_SESSION_KEY = 'fairshare-auth-demo-v1'
const DEMO_EMAIL = 'demo@fairshare.app'
const DEMO_PASSWORD = 'Fairshare123'

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
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapSupabaseUser(user: SupabaseUser): AuthProfile {
  const metadata = user.user_metadata ?? {}
  const provider = user.app_metadata.provider
  return {
    id: user.id,
    email: user.email ?? '',
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Fairshare member',
    avatarUrl: metadata.avatar_url || metadata.picture,
    provider: provider === 'google' || provider === 'apple' || provider === 'github' ? provider : 'email',
    isDemo: false,
  }
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

function friendlyError(caught: unknown): Error {
  if (caught instanceof Error) return caught
  return new Error('Authentication could not be completed. Please try again.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setUser(loadDemoSession())
      setLoading(false)
      return
    }

    let mounted = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.error('Could not restore authentication session', error)
      setUser(data.session?.user ? mapSupabaseUser(data.session.user) : null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ? mapSupabaseUser(session.user) : null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
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
    configured: isSupabaseConfigured,
    demoCredentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD },

    async signInWithEmail(email, password) {
      try {
        if (supabase) {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          return {}
        }
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        if (email.toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          throw new Error(`Demo mode: use ${DEMO_EMAIL} and ${DEMO_PASSWORD}.`)
        }
        const profile: AuthProfile = {
          id: 'demo-email-user',
          email: DEMO_EMAIL,
          name: 'Riya Kapoor',
          provider: 'email',
          isDemo: true,
        }
        saveDemoSession(profile)
        setUser(profile)
        return {}
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signUpWithEmail(name, email, password) {
      try {
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
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        const profile: AuthProfile = {
          id: crypto.randomUUID(),
          email,
          name,
          provider: 'email',
          isDemo: true,
        }
        saveDemoSession(profile)
        setUser(profile)
        return { message: 'Demo account created locally on this device.' }
      } catch (caught) {
        throw friendlyError(caught)
      }
    },

    async signInWithSocial(provider) {
      try {
        if (!supabase) {
          throw new Error('Social sign-in needs a configured Supabase project and enabled provider. Add the public project keys, then enable this provider in Supabase Auth.')
        }
        if (isNativeAuth()) {
          await startNativeOAuth(provider)
          return {}
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: getAuthRedirectUrl() },
        })
        if (error) throw error
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
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      saveDemoSession(null)
      setUser(null)
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
