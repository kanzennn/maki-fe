import { describe, expect, it } from 'vitest'

import { parsePercent } from '@/shared/lib/percent'
import { testOutlet } from '@/test/fixtures'

import { outletSchema, outletValues, toOutletInput } from './schemas'

const valid = outletValues('id')
/** The rule each field broke, as the form shows them. */
function broken(values: Partial<typeof valid>) {
  const result = outletSchema.safeParse({ ...valid, ...values, code: values.code ?? 'BDG01', name: values.name ?? 'Maki' })
  if (result.success) return {}
  // The form shows a field's first issue.
  const first: Record<string, string> = {}
  for (const issue of result.error.issues) first[issue.path.join('.')] ??= issue.message
  return first
}

describe('outletSchema', () => {
  it('follows the server: the code is 2 to 10 letters and digits, in either case', () => {
    expect(broken({ code: 'bdg01' })).toEqual({})
    expect(broken({ code: 'B' })).toEqual({ code: 'format' })
    expect(broken({ code: 'BDG-01' })).toEqual({ code: 'format' })
  })

  it('wants both opening hours or neither, and not the same', () => {
    expect(broken({ open_time: '22:00', close_time: '02:00' })).toEqual({})
    expect(broken({ open_time: '08:00' })).toEqual({ close_time: 'required' })
    expect(broken({ close_time: '22:00' })).toEqual({ open_time: 'required' })
    expect(broken({ open_time: '08:00', close_time: '08:00' })).toEqual({ close_time: 'different' })
  })

  it('takes percentages from 0 to 100 with two decimals, with a comma or a point', () => {
    expect(broken({ tax_pct: '11', service_pct: '5,5' })).toEqual({})
    expect(broken({ tax_pct: '12.75' })).toEqual({})
    expect(broken({ tax_pct: '5,555' })).toEqual({ tax_pct: 'decimals' })
    expect(broken({ tax_pct: '101' })).toEqual({ tax_pct: 'range' })
    expect(broken({ tax_pct: 'sebelas' })).toEqual({ tax_pct: 'format' })
  })
})

describe('outlet values', () => {
  it('shows percentages the way the language writes them, and reads them back', () => {
    const values = outletValues('id', testOutlet)
    expect(values.service_pct).toBe('5,5')
    expect(outletValues('en', testOutlet).service_pct).toBe('5.5')
    expect(parsePercent(values.service_pct)).toBe(5.5)
    expect(parsePercent('')).toBe(0)
  })

  it('sends empty fields as no value', () => {
    const input = toOutletInput({ ...valid, code: ' bdg01 ', name: ' Maki ', address: '  ', tax_pct: '11' })
    expect(input).toMatchObject({
      code: 'bdg01',
      name: 'Maki',
      address: null,
      phone: null,
      open_time: null,
      close_time: null,
      tax_pct: 11,
      service_pct: 0,
    })
  })
})
