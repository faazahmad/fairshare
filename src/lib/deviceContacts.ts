import { Capacitor } from '@capacitor/core'
import { normalizeMsisdn } from './directSplits'

export interface PickedDeviceContact {
  name: string
  msisdn: string
}

export function canPickDeviceContact(): boolean {
  return Capacitor.isNativePlatform()
}

export async function pickDeviceContact(): Promise<PickedDeviceContact> {
  if (!canPickDeviceContact()) {
    throw new Error('Phone contacts are available in the installed iOS or Android app.')
  }

  const { Contacts } = await import('@capacitor/contacts')
  const picked = await Contacts.pickContact()
  const preferredPhone = picked.phoneNumbers?.find((entry) => entry.pref)?.value
    ?? picked.phoneNumbers?.[0]?.value
  const name = picked.displayName
    ?? picked.name?.formatted
    ?? [picked.name?.givenName, picked.name?.familyName].filter(Boolean).join(' ')
  const msisdn = normalizeMsisdn(preferredPhone ?? '')

  if (!name?.trim()) throw new Error('That contact does not have a name.')
  if (!msisdn) throw new Error('That contact does not have a phone number.')
  return { name: name.trim(), msisdn }
}
