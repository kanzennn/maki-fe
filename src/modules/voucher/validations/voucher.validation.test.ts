import { describe, expect, it } from 'vitest'

import { ValidationError } from '@/lib/validation'

import type { VoucherFormValues } from '../types'
import { validateVoucherForm } from './voucher.validation'

const valid: VoucherFormValues = {
  code: 'merdeka17',
  name: '',
  type: 'percent',
  value: '12,5',
  max_discount: '',
  min_spend: '',
  quota: '100',
  start_at: '',
  expired_at: '2026-08-31T23:59',
  all_outlets: true,
  outlet_ids: [],
  is_active: true,
}

/** The rules the values break, by field: the first of each, as the form shows it. */
function broken(edit: Partial<VoucherFormValues>): Record<string, string> {
  try {
    validateVoucherForm({ ...valid, ...edit })
    return {}
  } catch (error) {
    if (error instanceof ValidationError) return { ...error.fields }
    throw error
  }
}

describe('validateVoucherForm', () => {
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
    expect(broken({ start_at: '2026-13-01T00:00', expired_at: '2026-08-31T25:00' })).toEqual({
      start_at: 'format',
      expired_at: 'format',
    })
  })

  it('needs an outlet for a voucher not for all of them', () => {
    expect(broken({ all_outlets: false })).toEqual({ outlet_ids: 'required' })
  })
})

describe('the voucher for the API', () => {
  it('sends a percentage as basis points, in capitals, times as WIB, without what doesn’t apply', () => {
    expect(validateVoucherForm({ ...valid, name: '  ', max_discount: '20000', outlet_ids: ['o1'] })).toEqual({
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
    const amount = validateVoucherForm({
      ...valid,
      type: 'amount',
      value: '5000',
      max_discount: '20000',
      min_spend: '50000',
      start_at: '2026-08-17T00:00',
      all_outlets: false,
      outlet_ids: ['o2', 'o1'],
    })
    expect(amount).toMatchObject({
      value: 5000,
      max_discount: null,
      min_spend: 50000,
      start_at: '2026-08-16T17:00:00.000Z',
      all_outlets: false,
      outlet_ids: ['o2', 'o1'],
    })
    expect(validateVoucherForm({ ...valid, value: '33,33' }).value).toBe(3333)
  })
})
