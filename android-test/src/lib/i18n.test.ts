import { describe, expect, it } from 'vitest'
import { localeForLanguage, resolveLanguage, translate } from './i18n'

describe('regional preferences', () => {
  it('falls back to English for unknown or missing language values', () => {
    expect(resolveLanguage()).toBe('en')
    expect(resolveLanguage('fr')).toBe('en')
    expect(localeForLanguage('fr')).toBe('en-IN')
  })

  it('translates shared app-shell labels and interpolates values', () => {
    expect(translate('hi', 'home')).toBe('होम')
    expect(translate('es', 'monthlySpend', { month: 'agosto' })).toBe('Tu gasto de agosto')
    expect(translate('en', 'acrossGroups', { count: 3 })).toBe('Across 3 groups')
  })
})
