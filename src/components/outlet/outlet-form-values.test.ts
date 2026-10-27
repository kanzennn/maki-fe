import { describe, expect, it } from 'vitest'

import { parsePercent } from '@/lib/percent'
import { testOutlet } from '@/test/fixtures'

import { outletFormValues } from './outlet-form-values'

describe('outletFormValues', () => {
  it('shows percentages the way the language writes them, and reads them back', () => {
    const values = outletFormValues('id', testOutlet)
    expect(values.service_pct).toBe('5,5')
    expect(outletFormValues('en', testOutlet).service_pct).toBe('5.5')
    expect(parsePercent(values.service_pct)).toBe(5.5)
    expect(parsePercent('')).toBe(0)
  })

  it("gives a new outlet the defaults: Jakarta's zone, Indonesian, no tax or service", () => {
    expect(outletFormValues('id')).toMatchObject({ timezone: 'Asia/Jakarta', locale: 'id', tax_pct: '0', service_pct: '0' })
  })
})
