import { describe, expect, it } from 'vitest'

// A copy of the backend's file, which its Go tests read too: npm run
// sync:vectors brings it up to date.
import vectors from '@/test/vectors/order-totals.json'

import { computeTotals } from './compute-totals.usecase'

describe('computeTotals', () => {
  it('has cases to check', () => {
    expect(vectors.cases.length).toBeGreaterThan(10)
  })

  it.each(vectors.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(computeTotals(c.lines, c.discount, c.service_bps, c.tax_bps)).toEqual(c.expected)
  })
})
