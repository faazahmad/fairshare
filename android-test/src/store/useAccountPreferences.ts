import { useEffect, useState } from 'react'
import type { NotificationPreferences, SecurityPreferences } from '../domain/types'

const STORAGE_KEY = 'fairshare-account-preferences-v1'

const defaultNotifications: NotificationPreferences = {
  pushEnabled: false,
  expenseUpdates: true,
  settlementReminders: true,
  groupInvites: true,
  weeklyDigest: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
}

const defaultSecurity: SecurityPreferences = {
  loginAlerts: true,
  confirmSensitiveActions: true,
}

function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { notifications: defaultNotifications, security: defaultSecurity }
    const parsed = JSON.parse(stored) as { notifications?: Partial<NotificationPreferences>; security?: Partial<SecurityPreferences> }
    return {
      notifications: { ...defaultNotifications, ...parsed.notifications },
      security: { ...defaultSecurity, ...parsed.security },
    }
  } catch {
    return { notifications: defaultNotifications, security: defaultSecurity }
  }
}

export function useAccountPreferences() {
  const [settings, setSettings] = useState(loadPreferences)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  function updateNotifications(patch: Partial<NotificationPreferences>) {
    setSettings((current) => ({ ...current, notifications: { ...current.notifications, ...patch } }))
  }

  function updateSecurity(patch: Partial<SecurityPreferences>) {
    setSettings((current) => ({ ...current, security: { ...current.security, ...patch } }))
  }

  return { ...settings, updateNotifications, updateSecurity }
}
