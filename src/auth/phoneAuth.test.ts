import { describe, expect, it } from 'vitest'
import { digitsOnly, INDIA_COUNTRY, toE164 } from './phoneAuth'

describe('phone authentication helpers', () => {
  const india = INDIA_COUNTRY

  it('caps Indian input at ten digits', () => {
    expect(digitsOnly('98765 43210 99', india.maxDigits)).toBe('9876543210')
  })

  it('formats a valid Indian number as E.164', () => {
    expect(toE164(india, '98765 43210')).toBe('+919876543210')
  })

  it('rejects invalid Indian numbers', () => {
    expect(() => toE164(india, '1234567890')).toThrow(/begin with/)
    expect(() => toE164(india, '987654321')).toThrow(/10-digit/)
  })
})
