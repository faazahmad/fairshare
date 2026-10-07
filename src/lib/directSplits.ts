import type { Contact, User } from '../domain/types'

export const DIRECT_SPLIT_GROUP_ID = 'direct-splits'
export const CONTACTS_STORAGE_KEY = 'fairshare-contacts-v1'

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'FS'
}

export function normalizeMsisdn(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return digits ? `+${digits}` : ''
}

export function isValidMsisdn(value: string): boolean {
  const digits = normalizeMsisdn(value).replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export function contactParticipantId(contact: Contact): string {
  return contact.contactUserId ? String(contact.contactUserId) : `contact:${contact.id}`
}

export function contactAsUser(contact: Contact): User {
  return {
    id: contactParticipantId(contact),
    name: contact.name,
    email: '',
    initials: initialsFor(contact.name),
    color: contact.isRegisteredUser ? '#1f9d8b' : '#7168d9',
    phone: contact.msisdn,
  }
}

export function mergeContacts(...sets: Contact[][]): Contact[] {
  const merged = new Map<string, Contact>()
  for (const contact of sets.flat()) {
    const key = normalizeMsisdn(contact.msisdn) || String(contact.id)
    merged.set(key, { ...merged.get(key), ...contact, msisdn: normalizeMsisdn(contact.msisdn) || contact.msisdn })
  }
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function readLocalContacts(): Contact[] {
  try {
    const saved = localStorage.getItem(CONTACTS_STORAGE_KEY)
    return saved ? JSON.parse(saved) as Contact[] : []
  } catch {
    return []
  }
}

export function saveLocalContacts(contacts: Contact[]): void {
  localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts))
}
