export interface PhoneCountry {
  iso: 'IN' | 'US' | 'GB'
  label: string
  flag: string
  dialCode: string
  maxDigits: number
  exactDigits?: number
}

export const INDIA_COUNTRY: PhoneCountry = { iso: 'IN', label: 'India', flag: '🇮🇳', dialCode: '+91', maxDigits: 10, exactDigits: 10 }
export const PHONE_COUNTRIES: PhoneCountry[] = [
  INDIA_COUNTRY,
  { iso: 'US', label: 'United States', flag: '🇺🇸', dialCode: '+1', maxDigits: 10, exactDigits: 10 },
  { iso: 'GB', label: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', maxDigits: 10 },
]

export function digitsOnly(value: string, maxDigits: number): string {
  return value.replace(/\D/g, '').slice(0, maxDigits)
}

export function toE164(country: PhoneCountry, nationalNumber: string): string {
  const digits = digitsOnly(nationalNumber, country.maxDigits)
  if (country.exactDigits && digits.length !== country.exactDigits) {
    throw new Error(`Enter a valid ${country.exactDigits}-digit ${country.label} mobile number.`)
  }
  if (!country.exactDigits && digits.length < 7) throw new Error('Enter a valid mobile number.')
  if (country.iso === 'IN' && !/^[6-9]/.test(digits)) {
    throw new Error('Indian mobile numbers must begin with 6, 7, 8, or 9.')
  }
  return `${country.dialCode}${digits}`
}
