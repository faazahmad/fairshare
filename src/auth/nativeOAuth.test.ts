import { describe, expect, it } from 'vitest'
import { parseNativeOAuthCallback } from './nativeOAuth'

describe('parseNativeOAuthCallback', () => {
  it('reads the backend tokens from the native callback fragment', () => {
    expect(parseNativeOAuthCallback(
      'com.fairshare.app://auth/callback#access_token=access.jwt&refresh_token=refresh-id',
    )).toEqual({
      accessToken: 'access.jwt',
      refreshToken: 'refresh-id',
    })
  })

  it('ignores deep links that are not the configured authentication callback', () => {
    expect(parseNativeOAuthCallback('com.fairshare.app://groups/123')).toBeNull()
    expect(parseNativeOAuthCallback('another.app://auth/callback#access_token=a&refresh_token=b')).toBeNull()
  })

  it('surfaces provider errors returned by the backend', () => {
    expect(() => parseNativeOAuthCallback(
      'com.fairshare.app://auth/callback#error=Access%20denied',
    )).toThrow('Access denied')
  })

  it('rejects incomplete token responses', () => {
    expect(() => parseNativeOAuthCallback(
      'com.fairshare.app://auth/callback#access_token=access.jwt',
    )).toThrow('incomplete session')
  })
})
