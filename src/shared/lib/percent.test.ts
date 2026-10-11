import { describe, expect, it } from 'vitest'

import { formatRate, parsePercent, showPercent } from './percent'

describe('percentages', () => {
  it('writes a rate in basis points in the language', () => {
    expect(formatRate(1000, 'id')).toBe('10%')
    expect(formatRate(550, 'id')).toBe('5,5%')
    expect(formatRate(550, 'en')).toBe('5.5%')
    expect(formatRate(1250, 'en')).toBe('12.5%')
  })

  it('reads one typed with a comma or a point', () => {
    expect(parsePercent(' 5,5 ')).toBe(5.5)
    expect(parsePercent('12.25')).toBe(12.25)
    expect(parsePercent('')).toBe(0)
  })

  it('shows one for a field, without grouping', () => {
    expect(showPercent(5.5, 'id')).toBe('5,5')
    expect(showPercent(12.25, 'en')).toBe('12.25')
    expect(showPercent(1000, 'en')).toBe('1000')
  })
})
