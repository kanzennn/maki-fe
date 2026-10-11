import { describe, expect, it } from 'vitest'

import { testVoucher } from '@/test/fixtures'

import { fromWibInput, toVoucherInput, toWibInput, voucherSchema, voucherValues, type VoucherValues } from './schemas'

const valid: VoucherValues = {
  ...voucherValues('id'),
  code: 'merdeka17',
  value: '12,5',
  quota: '100',
  expired_at: '2026-08-31T23:59',
}

/** The rules the values break, by field: the first of each, as the form shows it. */
function broken(edit: Partial<VoucherValues>): Record<string, string> {
  const result = voucherSchema.safeParse({ ...valid, ...edit })
  if (result.success) return {}
  const rules: Record<string, string> = {}
  for (const issue of result.error.issues) rules[issue.path.join('.')] ??= issue.message
  return rules
}

describe('voucherSchema', () => {
  it('takes a voucher filled in', () => {
    expect(broken({})).toEqual({})
    expect(broken({ type: 'amount', value: '5000' })).toEqual({})
    expect(broken({ start_at: '2026-08-17T00:00', all_outlets: false, outlet_ids: ['o1'] })).toEqual({})
  })

  it('holds the code to 3–20 letters and digits', () => {
    expect(broken({ code: '  ' })).toEqual({ code: 'required' })
    expect(broken({ code: 'AB' })).toEqual({ code: 'format' })
    expect(broken({ code: 'A'.repeat(21) })).toEqual({ code: 'format' })
    expect(broken({ code: 'HEMAT-5' })).toEqual({ code: 'format' })
    expect(broken({ code: '  hemat5 ' })).toEqual({})
  })

  it('holds a percentage to more than 0 and at most 100, with two decimals', () => {
    expect(broken({ value: '' })).toEqual({ value: 'required' })
    expect(broken({ value: 'sepuluh' })).toEqual({ value: 'format' })
    expect(broken({ value: '12,345' })).toEqual({ value: 'decimals' })
    expect(broken({ value: '0' })).toEqual({ value: 'range' })
    expect(broken({ value: '100,01' })).toEqual({ value: 'range' })
    expect(broken({ value: '100' })).toEqual({})
    expect(broken({ value: '0.01' })).toEqual({})
  })

  it('holds amounts to 1 to a billion', () => {
    expect(broken({ type: 'amount', value: '0' })).toEqual({ value: 'range' })
    expect(broken({ type: 'amount', value: '1000000001' })).toEqual({ value: 'range' })
    expect(broken({ max_discount: '0' })).toEqual({ max_discount: 'range' })
    expect(broken({ min_spend: '1000000001' })).toEqual({ min_spend: 'range' })
    // An amount has no maximum, whatever the field still holds.
    expect(broken({ type: 'amount', value: '5000', max_discount: '0' })).toEqual({})
  })

  it('needs a quota of 1 to a million', () => {
    expect(broken({ quota: '' })).toEqual({ quota: 'required' })
    expect(broken({ quota: '0' })).toEqual({ quota: 'range' })
    expect(broken({ quota: '1000001' })).toEqual({ quota: 'range' })
  })

  it('needs an expiry after the start', () => {
    expect(broken({ expired_at: '' })).toEqual({ expired_at: 'required' })
    expect(broken({ start_at: '2026-08-31T23:59' })).toEqual({ expired_at: 'after' })
    expect(broken({ start_at: '2026-09-01T00:00' })).toEqual({ expired_at: 'after' })
    expect(broken({ start_at: '2026-08-31T23:58' })).toEqual({})
  })

  it('needs an outlet for a voucher not for all of them', () => {
    expect(broken({ all_outlets: false })).toEqual({ outlet_ids: 'required' })
  })
})

describe('the form and the API', () => {
  it('reads the times in WIB, whatever the browser', () => {
    expect(fromWibInput('2026-08-17T00:00')).toBe('2026-08-16T17:00:00.000Z')
    expect(toWibInput('2026-08-16T17:00:00Z')).toBe('2026-08-17T00:00')
    expect(toWibInput('2026-08-31T16:59:59Z')).toBe('2026-08-31T23:59')
  })

  it('sends a percentage as basis points, in capitals, without what doesn’t apply', () => {
    expect(toVoucherInput({ ...valid, name: '  ', max_discount: '20000', outlet_ids: ['o1'] })).toEqual({
      code: 'MERDEKA17',
      name: null,
      type: 'percent',
      value: 1250,
      max_discount: 20000,
      min_spend: null,
      quota: 100,
      start_at: null,
      expired_at: '2026-08-31T16:59:00.000Z',
      all_outlets: true,
      outlet_ids: [],
      is_active: true,
    })
    const amount = toVoucherInput({ ...valid, type: 'amount', value: '5000', max_discount: '20000', min_spend: '50000',
      start_at: '2026-08-17T00:00', all_outlets: false, outlet_ids: ['o2', 'o1'] })
    expect(amount).toMatchObject({ value: 5000, max_discount: null, min_spend: 50000, start_at: '2026-08-16T17:00:00.000Z',
      all_outlets: false, outlet_ids: ['o2', 'o1'] })
    expect(toVoucherInput({ ...valid, value: '33,33' }).value).toBe(3333)
  })

  it('fills the form from a voucher', () => {
    expect(voucherValues('id', testVoucher)).toEqual({
      code: 'MERDEKA17',
      name: 'Diskon Merdeka',
      type: 'percent',
      value: '12,5',
      max_discount: '20000',
      min_spend: '50000',
      quota: '100',
      start_at: '2026-08-17T00:00',
      expired_at: '2026-08-31T23:59',
      all_outlets: false,
      outlet_ids: ['o1'],
      is_active: true,
    })
    expect(voucherValues('en', testVoucher).value).toBe('12.5')
    expect(voucherValues('id', { ...testVoucher, type: 'amount', value: 5000, max_discount: null }).value).toBe('5000')
  })
})
