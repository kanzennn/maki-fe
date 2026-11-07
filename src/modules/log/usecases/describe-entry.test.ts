import { describe, expect, it } from 'vitest'

import { changes, targetName } from './describe-entry.usecase'

describe('describing a log entry', () => {
  it('names the target from what it stored, what it became first', () => {
    expect(targetName({ before: { name: 'Kopi' }, after: { name: 'Kopi Susu' } })).toBe('Kopi Susu')
    expect(targetName({ before: { name: 'Kopi' }, after: null })).toBe('Kopi')
    expect(targetName({ before: null, after: { order_no: 'BDG01-K01-20261001-0001', total: 5 } })).toBe('BDG01-K01-20261001-0001')
    expect(targetName({ before: { price: 1 }, after: { price: 2 } })).toBeNull()
    expect(targetName({ before: null, after: null })).toBeNull()
  })

  it('lays the values side by side, as they were stored', () => {
    expect(changes({ before: { price: 10, name: 'A' }, after: { price: 12, active: true } })).toEqual([
      { field: 'price', before: '10', after: '12' },
      { field: 'name', before: 'A', after: '-' },
      { field: 'active', before: '-', after: 'true' },
    ])
    expect(changes({ before: null, after: null })).toEqual([])
  })
})
