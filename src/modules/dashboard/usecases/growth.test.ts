import { describe, expect, it } from 'vitest'

import { growth } from './growth.usecase'

describe('growth', () => {
  it('compares with the period before', () => {
    expect(growth(150, 100)).toBe(0.5)
    expect(growth(50, 100)).toBe(-0.5)
    expect(growth(100, 100)).toBe(0)
  })

  it('says nothing with nothing to compare with', () => {
    expect(growth(100, 0)).toBeNull()
  })
})
