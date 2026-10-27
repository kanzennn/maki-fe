import { describe, expect, it } from 'vitest'

import { formatChange, formatNumber, groupDigits } from './number'

describe('numbers', () => {
  it('groups thousands the way the language does', () => {
    expect(formatNumber(1250, 'id')).toBe('1.250')
    expect(formatNumber(1250, 'en')).toBe('1,250')
    expect(formatNumber(0, 'id')).toBe('0')
  })

  it('signs a change, and leaves no change unsigned', () => {
    expect(formatChange(5, 'id')).toBe('+5')
    expect(formatChange(-1200, 'id')).toBe('-1.200')
    expect(formatChange(0, 'id')).toBe('0')
  })

  it("shows a field's digits grouped, and nothing as nothing", () => {
    expect(groupDigits('100000000', 'id')).toBe('100.000.000')
    expect(groupDigits('25000', 'en')).toBe('25,000')
    expect(groupDigits('', 'id')).toBe('')
  })
})
