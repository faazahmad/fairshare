import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { SocialProvider } from './types'
import { getAuthRedirectUrl, supabase } from './supabase'

function callbackParameters(url: string): URLSearchParams {
  const parsed = new URL(url)
  const parameters = new URLSearchParams(parsed.search)
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  hash.forEach((value, key) => parameters.set(key, value))
  return parameters
}

export function isNativeAuth(): boolean {
  return Capacitor.isNativePlatform()
}

export async function startNativeOAuth(provider: SocialProvider): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data.url) throw new Error('The sign-in provider did not return an authorization URL.')
  await Browser.open({ url: data.url, presentationStyle: 'popover' })
}

export async function completeNativeOAuth(url: string): Promise<boolean> {
  if (!supabase || !isNativeAuth() || !url.startsWith(getAuthRedirectUrl())) return false
  const parameters = callbackParameters(url)
  const providerError = parameters.get('error_description') ?? parameters.get('error')
  if (providerError) throw new Error(providerError)

  const accessToken = parameters.get('access_token')
  const refreshToken = parameters.get('refresh_token')
  if (!accessToken || !refreshToken) throw new Error('The provider returned an incomplete sign-in session.')

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error) throw error
  await Browser.close().catch(() => undefined)
  return true
}

export async function listenForNativeOAuth(): Promise<() => Promise<void>> {
  if (!isNativeAuth()) return async () => undefined
  const listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void completeNativeOAuth(url).catch((error) => console.error('Could not complete social sign-in', error))
  })
  const launch = await CapacitorApp.getLaunchUrl()
  if (launch?.url) void completeNativeOAuth(launch.url).catch((error) => console.error('Could not restore social sign-in', error))
  return () => listener.remove()
}
