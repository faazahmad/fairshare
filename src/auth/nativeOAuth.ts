import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { SocialProvider } from './types'

const DEFAULT_NATIVE_AUTH_REDIRECT_URL = 'com.fairshare.app://auth/callback'

export interface NativeOAuthSession {
  accessToken: string
  refreshToken: string
}

function getNativeAuthRedirectUrl(): string {
  return (import.meta.env.VITE_NATIVE_AUTH_REDIRECT_URL || DEFAULT_NATIVE_AUTH_REDIRECT_URL).replace(/\/$/, '')
}

function callbackParameters(url: string): URLSearchParams {
  const parsed = new URL(url)
  const parameters = new URLSearchParams(parsed.search)
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  hash.forEach((value, key) => parameters.set(key, value))
  return parameters
}

function matchesNativeCallback(url: string): boolean {
  const expected = new URL(getNativeAuthRedirectUrl())
  const actual = new URL(url)
  return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname
}

export function isNativeAuth(): boolean {
  return Capacitor.isNativePlatform()
}

export function parseNativeOAuthCallback(url: string): NativeOAuthSession | null {
  if (!matchesNativeCallback(url)) return null

  const parameters = callbackParameters(url)
  const providerError = parameters.get('error_description') ?? parameters.get('error')
  if (providerError) throw new Error(providerError)

  const accessToken = parameters.get('access_token')
  const refreshToken = parameters.get('refresh_token')
  if (!accessToken || !refreshToken) {
    throw new Error('The sign-in provider returned an incomplete session. Please try again.')
  }

  return { accessToken, refreshToken }
}

export async function startNativeOAuth(provider: SocialProvider, apiBaseUrl: string): Promise<void> {
  if (provider !== 'google' && provider !== 'github') {
    throw new Error('Apple sign-in is coming soon.')
  }

  const authorizationUrl = new URL(`${apiBaseUrl}/auth/oauth/${provider}`)
  authorizationUrl.searchParams.set('client', 'native')
  await Browser.open({
    url: authorizationUrl.toString(),
    presentationStyle: 'popover',
    toolbarColor: '#0f4f43',
  })
}

export async function completeNativeOAuth(url: string): Promise<NativeOAuthSession | null> {
  const session = parseNativeOAuthCallback(url)
  if (!session) return null
  await Browser.close().catch(() => undefined)
  return session
}

export async function listenForNativeOAuth(
  onSession: (session: NativeOAuthSession) => void | Promise<void>,
  onError: (error: Error) => void,
): Promise<() => Promise<void>> {
  if (!isNativeAuth()) return async () => undefined

  const handleCallback = async (url: string) => {
    try {
      const session = await completeNativeOAuth(url)
      if (session) await onSession(session)
    } catch (caught) {
      await Browser.close().catch(() => undefined)
      onError(caught instanceof Error ? caught : new Error('Social sign-in could not be completed.'))
    }
  }

  const listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleCallback(url)
  })
  const launch = await CapacitorApp.getLaunchUrl()
  if (launch?.url) void handleCallback(launch.url)

  return () => listener.remove()
}
