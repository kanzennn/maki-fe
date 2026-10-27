import { describe, expect, it } from 'vitest'

import { testVoucher } from '@/test/fixtures'

import { voucherFormValues } from './voucher-form-values'

describe('voucherFormValues', () => {
  it('fills the form from a voucher, its times as WIB shows them', () => {
    expect(voucherFormValues('id', testVoucher)).toEqual({
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
    expect(voucherFormValues('en', testVoucher).value).toBe('12.5')
    expect(voucherFormValues('id', { ...testVoucher, type: 'amount', value: 5000, max_discount: null }).value).toBe('5000')
  })

  it('reads an instant in WIB, whatever the browser', () => {
    expect(voucherFormValues('id', { ...testVoucher, start_at: '2026-08-16T17:00:00Z' }).start_at).toBe('2026-08-17T00:00')
    expect(voucherFormValues('id', { ...testVoucher, expired_at: '2026-08-31T16:59:59Z' }).expired_at).toBe('2026-08-31T23:59')
  })

  it('gives a new voucher the defaults: a percentage, for every outlet, active', () => {
    expect(voucherFormValues('id')).toMatchObject({ type: 'percent', all_outlets: true, outlet_ids: [], is_active: true })
  })
})
