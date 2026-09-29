import { describe, expect, it } from 'vitest'
import type { Contact } from '../domain/types'
import { contactParticipantId, isValidMsisdn, mergeContacts, normalizeMsisdn } from './directSplits'

describe('direct split contacts', () => {
  it('normalizes Indian local numbers and preserves international numbers', () => {
    expect(normalizeMsisdn('98765 43210')).toBe('+919876543210')
    expect(normalizeMsisdn('+1 (415) 555-2671')).toBe('+14155552671')
    expect(isValidMsisdn('98765 43210')).toBe(true)
    expect(isValidMsisdn('1234')).toBe(false)
  })

  it('uses the Fairshare account id for registered contacts and a stable guest id otherwise', () => {
    expect(contactParticipantId({ id: 'local-1', name: 'Aanya', msisdn: '+919876543210', addedAt: '2026-09-29' })).toBe('contact:local-1')
    expect(contactParticipantId({
      id: 'saved-1',
      name: 'Rohan',
      msisdn: '+919123456780',
      addedAt: '2026-09-29',
      contactUserId: 'user-42',
      isRegisteredUser: true,
    })).toBe('user-42')
  })

  it('deduplicates contacts by normalized phone and keeps richer backend details', () => {
    const local: Contact = { id: 'local-1', name: 'Aanya', msisdn: '9876543210', addedAt: '2026-09-29' }
    const registered: Contact = {
      id: 'backend-1',
      name: 'Aanya Sharma',
      msisdn: '+91 98765 43210',
      addedAt: '2026-09-29',
      contactUserId: 'user-7',
      isRegisteredUser: true,
    }

    expect(mergeContacts([local], [registered])).toEqual([{ ...registered, msisdn: '+919876543210' }])
  })
})
