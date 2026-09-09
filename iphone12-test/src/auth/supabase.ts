import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Capacitor.isNativePlatform(),
      },
    })
  : null

export function getAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_NATIVE_AUTH_REDIRECT_URL?.trim() || 'com.fairshare.app://auth/callback'
  }
  return import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin
}
