import { describe, expect, it } from 'vitest'
import { formatCurrentMonth, formatDateOnly, formatTodayHeading, greetingForTime, localDateValue, localMonthValue, parseDateOnly, relativeTimestamp } from './dates'

describe('local calendar helpers', () => {
  it('builds local input values without converting through UTC', () => {
    const lateLocalTime = new Date(2026, 7, 12, 23, 55)
    expect(localDateValue(lateLocalTime)).toBe('2026-08-12')
    expect(localMonthValue(lateLocalTime)).toBe('2026-08')
  })

  it('parses date-only values at local noon and formats live headings', () => {
    expect(parseDateOnly('2026-08-12').getHours()).toBe(12)
    expect(formatDateOnly('2026-08-12', { day: 'numeric', month: 'long', year: 'numeric' })).toContain('2026')
    expect(formatTodayHeading(new Date(2026, 7, 12, 10))).toMatch(/Wednesday.*12.*August/i)
    expect(formatCurrentMonth(new Date(2026, 7, 12))).toBe('August')
  })

  it('updates greeting and relative time from the supplied current time', () => {
    expect(greetingForTime(new Date(2026, 7, 12, 8))).toBe('Good morning')
    expect(greetingForTime(new Date(2026, 7, 12, 15))).toBe('Good afternoon')
    expect(greetingForTime(new Date(2026, 7, 12, 21))).toBe('Good evening')
    expect(relativeTimestamp('2026-08-12T09:30:00+05:30', new Date('2026-08-12T10:15:00+05:30'))).toBe('45m ago')
  })
})
