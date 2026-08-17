const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function localDateValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localMonthValue(date = new Date()): string {
  return localDateValue(date).slice(0, 7)
}

export function parseDateOnly(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return new Date(Number.NaN)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

export function formatDateOnly(value: string, options: Intl.DateTimeFormatOptions, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, options).format(parseDateOnly(value))
}

export function formatTodayHeading(date = new Date(), locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatCurrentMonth(date = new Date(), locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
}

export function greetingForTime(date = new Date(), language = 'en'): string {
  const hour = date.getHours()
  if (language === 'hi') return hour < 12 ? 'सुप्रभात' : hour < 17 ? 'नमस्कार' : 'शुभ संध्या'
  if (language === 'es') return hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function relativeTimestamp(value: string, now = new Date()): string {
  const date = new Date(value)
  const difference = now.getTime() - date.getTime()
  if (!Number.isFinite(difference)) return ''
  const minutes = Math.max(0, Math.floor(difference / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}
