export interface NativeOAuthTokens {
  accessToken: string
  refreshToken: string
}

export function parseNativeOAuthCallback(callbackUrl: string): NativeOAuthTokens | null {
  const parsed = new URL(callbackUrl)
  if (parsed.protocol !== 'com.fairshare.app:' || parsed.hostname !== 'auth' || parsed.pathname !== '/callback') return null

  const parameters = new URLSearchParams(parsed.search)
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  fragment.forEach((value, key) => parameters.set(key, value))

  const providerError = parameters.get('error_description') ?? parameters.get('error')
  if (providerError) throw new Error(decodeURIComponent(providerError))

  const accessToken = parameters.get('access_token')
  const refreshToken = parameters.get('refresh_token')
  if (!accessToken && !refreshToken) return null
  if (!accessToken || !refreshToken) throw new Error('The sign-in provider returned an incomplete session.')
  return { accessToken, refreshToken }
}
