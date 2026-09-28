import { Capacitor } from '@capacitor/core'

export function isNativeExperience(): boolean {
  if (Capacitor.isNativePlatform()) return true
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).has('nativePreview')
}

export function shouldHoldNativeIntro(): boolean {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('nativePreview') === 'hlp'
}

