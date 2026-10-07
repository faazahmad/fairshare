import { Capacitor } from '@capacitor/core'

export function isNativeExperience(): boolean {
  if (Capacitor.isNativePlatform()) return true
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(max-width: 680px)').matches) return true
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('nativePreview')
}

export function shouldHoldNativeIntro(): boolean {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('nativePreview') === 'hlp'
}
