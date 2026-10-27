import { describe, expect, it } from 'vitest'

import type { OrderDraft } from '../types'
import { afterSale } from './count-after-sale.usecase'
import { makeOrder } from './make-order.usecase'
import { newOrderId } from './new-order-id.usecase'
import { countFor, outletDay, receiptNumber } from './receipt-number.usecase'
import { renumber } from './renumber-order.usecase'

describe('outletDay', () => {
  it("is the outlet's day, whatever the browser's zone", () => {
    // Midnight in Bandung (UTC+7) is 17:00 UTC the day before.
    expect(outletDay(new Date('2026-09-30T16:59:59Z'), 'Asia/Jakarta')).toBe('2026-09-30')
    expect(outletDay(new Date('2026-09-30T17:00:00Z'), 'Asia/Jakarta')).toBe('2026-10-01')
    expect(outletDay(new Date('2026-09-30T17:00:00Z'), 'Asia/Jayapura')).toBe('2026-10-01')
    expect(outletDay(new Date('2026-09-30T17:00:00Z'), 'UTC')).toBe('2026-09-30')
  })
})

describe('receiptNumber', () => {
  it('is the prefix, the day and a count of at least four digits', () => {
    expect(receiptNumber('BDG01-K01', '2026-10-01', 1)).toBe('BDG01-K01-20261001-0001')
    expect(receiptNumber('BDG01-K12', '2026-10-01', 42)).toBe('BDG01-K12-20261001-0042')
    expect(receiptNumber('BDG01-K01', '2026-10-01', 12345)).toBe('BDG01-K01-20261001-12345')
  })

  it('starts the count again on a new day', () => {
    expect(countFor({ day: '2026-10-01', next: 7 }, '2026-10-01')).toBe(7)
    expect(countFor({ day: '2026-10-01', next: 7 }, '2026-10-02')).toBe(1)
  })
})

describe('newOrderId', () => {
  it('has the shape of a CUID2, and never repeats', () => {
    const ids = Array.from({ length: 2000 }, newOrderId)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]{23}$/)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

const device = {
  device: { device_id: 'd1', code: 'K01', name: 'Kasir depan', platform: 'web' as const },
  order_no_prefix: 'BDG01-K01',
  day: '2026-10-01',
  next_number: 5,
}

const draft: OrderDraft = {
  type: 'takeaway',
  items: [{ menu_id: 'kopi', qty: 2, price: 18000, note: null }],
  voucherCode: null,
  tableId: null,
  standNumber: null,
  total: 41580,
  received: 50000,
}

describe('makeOrder', () => {
  it("numbers the order from the device's count, for the outlet's day it was made on", () => {
    const at = new Date('2026-10-01T03:00:00Z')
    const order = makeOrder(draft, device, at, 'Asia/Jakarta')
    expect(order).toEqual({
      order_id: order.order_id,
      order_no: 'BDG01-K01-20261001-0005',
      type: 'takeaway',
      client_created_at: '2026-10-01T03:00:00.000Z',
      items: draft.items,
      total: 41580,
      payment: { method: 'cash', received: 50000 },
    })
    expect(order.order_id).toMatch(/^[a-z][a-z0-9]{23}$/)
    // A voucher goes with the order; none, and the order says nothing of it.
    expect(makeOrder({ ...draft, voucherCode: 'MERDEKA17' }, device, at, 'Asia/Jakarta').voucher_code).toBe('MERDEKA17')
    expect('voucher_code' in order).toBe(false)
    // So does a table.
    expect(makeOrder({ ...draft, type: 'dine_in', tableId: 't-a1' }, device, at, 'Asia/Jakarta').table_id).toBe('t-a1')
    expect('table_id' in order).toBe(false)
    // The next morning in Bandung: a new day, a new count.
    expect(makeOrder(draft, device, new Date('2026-10-01T17:30:00Z'), 'Asia/Jakarta').order_no).toBe(
      'BDG01-K01-20261002-0001',
    )
  })

  it('renumbers an order with its own day and ID', () => {
    const order = makeOrder(draft, device, new Date('2026-10-01T03:00:00Z'), 'Asia/Jakarta')
    const again = renumber(order, { ...device, next_number: 9 }, 'Asia/Jakarta')
    expect(again).toEqual({ ...order, order_no: 'BDG01-K01-20261001-0009' })
  })
})

describe('afterSale', () => {
  it('moves the count past the number just used, on its day only', () => {
    expect(afterSale(device, 'BDG01-K01-20261001-0005').next_number).toBe(6)
    expect(afterSale(device, 'BDG01-K01-20261001-0002').next_number).toBe(5)
    expect(afterSale(device, 'BDG01-K01-20261002-0001')).toBe(device)
  })
})
