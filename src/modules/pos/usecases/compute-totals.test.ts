import { describe, expect, it } from 'vitest'

// The backend's own file, which its Go tests read too: one rule for both,
// read where it lives, next to maki-fe, rather than from a copy that could
// drift.
import vectors from '../../../../../maki-be/api/test-vectors/order-totals.json'
import { computeTotals } from './compute-totals.usecase'

describe('computeTotals', () => {
  it('has cases to check', () => {
    expect(vectors.cases.length).toBeGreaterThan(10)
  })

  it.each(vectors.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(computeTotals(c.lines, c.discount, c.service_bps, c.tax_bps)).toEqual(c.expected)
  })
})
