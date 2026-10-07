import { useEffect, useState } from 'react'
import type { AppPreferences } from '../domain/types'

const STORAGE_KEY = 'fairshare-preferences-v1'

const defaults: AppPreferences = {
  theme: 'system',
  accent: 'coral',
  density: 'comfortable',
  hideBalances: false,
  reduceMotion: false,
}

function loadPreferences(): AppPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...defaults, ...JSON.parse(stored) as Partial<AppPreferences> } : defaults
  } catch {
    return defaults
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    const dark = preferences.theme === 'dark'
      || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.accent = preferences.accent
    document.documentElement.dataset.density = preferences.density
    document.documentElement.dataset.hideBalances = String(preferences.hideBalances)
    document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#173f3a')
  }, [preferences])

  useEffect(() => {
    if (preferences.theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      document.documentElement.dataset.theme = media.matches ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', media.matches ? '#000000' : '#173f3a')
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [preferences.theme])

  function updatePreferences(patch: Partial<AppPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }))
  }

  return { preferences, updatePreferences }
}
