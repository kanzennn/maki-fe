import { beforeEach, describe, expect, it } from 'vitest'

import type { CartLine } from '@/modules/pos/types'

import { useCart } from './use-cart'

const line = (over: Partial<CartLine> = {}): CartLine => ({ menuId: 'kopi', name: 'Kopi', qty: 1, note: '', ...over })

describe('useCart', () => {
  beforeEach(() => {
    useCart.setState({ owner: null })
    useCart.getState().clear()
  })

  it("is its owner's: someone else signing in gets an empty one", () => {
    useCart.getState().claim('u1')
    useCart.getState().setLines(() => [line()])
    useCart.getState().claim('u1')
    expect(useCart.getState().lines).toHaveLength(1)
    useCart.getState().claim('u2')
    expect(useCart.getState().lines).toEqual([])
    expect(useCart.getState().owner).toBe('u2')
  })

  it("can't change while a sale's answer hasn't come", () => {
    const voucher = { voucher_id: 'v1', code: 'MERDEKA17', name: null, type: 'percent' as const, value: 1250,
      max_discount: null, min_spend: null }
    useCart.getState().setVoucher(voucher)
    useCart.getState().setLines(() => [line()])
    useCart.getState().setPending({
      order_id: 'a1',
      order_no: 'BDG01-K01-20261001-0001',
      type: 'dine_in',
      client_created_at: '2026-10-01T03:00:00Z',
      items: [],
      total: 0,
      payment: { method: 'cash', received: 0 },
    })
    useCart.getState().setLines(() => [])
    useCart.getState().setVoucher(null)
    expect(useCart.getState().lines).toEqual([line()])
    expect(useCart.getState().voucher).toEqual(voucher)
    useCart.getState().setPending(null)
    useCart.getState().setLines(() => [])
    useCart.getState().setVoucher(null)
    expect(useCart.getState().lines).toEqual([])
    expect(useCart.getState().voucher).toBeNull()
  })

  it('holds its table while a sale is on its way, and lets go of it for a takeaway', () => {
    useCart.getState().setTable({ tableId: 't-a1', name: 'A1' })
    useCart.getState().setPending({
      order_id: 'a1',
      order_no: 'BDG01-K01-20261001-0001',
      type: 'dine_in',
      table_id: 't-a1',
      client_created_at: '2026-10-01T03:00:00Z',
      items: [],
      total: 0,
      payment: { method: 'cash', received: 0 },
    })
    useCart.getState().setTable(null)
    useCart.getState().setType('takeaway')
    expect(useCart.getState()).toMatchObject({ type: 'dine_in', table: { tableId: 't-a1', name: 'A1' } })
    useCart.getState().setPending(null)
    useCart.getState().setType('takeaway')
    expect(useCart.getState()).toMatchObject({ type: 'takeaway', table: null })
    useCart.getState().setType('dine_in')
    expect(useCart.getState().table).toBeNull()
  })

  it('lets the next customer start without the last one’s voucher, or table', () => {
    useCart.getState().setTable({ tableId: 't-a1', name: 'A1' })
    useCart.getState().setVoucher({ voucher_id: 'v1', code: 'HEMAT5', name: null, type: 'amount', value: 5000,
      max_discount: null, min_spend: null })
    useCart.getState().clear()
    expect(useCart.getState().voucher).toBeNull()
    expect(useCart.getState().table).toBeNull()
  })

  it("holds its stand's number while a sale is on its way, and lets go of it for a takeaway or the next customer", () => {
    useCart.getState().setStandNumber('a5')
    useCart.getState().setPending({
      order_id: 'a1',
      order_no: 'BDG01-K01-20261001-0001',
      type: 'dine_in',
      stand_number: 'A5',
      client_created_at: '2026-10-01T03:00:00Z',
      items: [],
      total: 0,
      payment: { method: 'cash', received: 0 },
    })
    useCart.getState().setStandNumber('')
    useCart.getState().setType('takeaway')
    expect(useCart.getState()).toMatchObject({ type: 'dine_in', standNumber: 'a5' })
    useCart.getState().setPending(null)
    useCart.getState().setType('takeaway')
    expect(useCart.getState()).toMatchObject({ type: 'takeaway', standNumber: '' })

    useCart.getState().setType('dine_in')
    useCart.getState().setStandNumber('12')
    useCart.getState().clear()
    expect(useCart.getState().standNumber).toBe('')
  })
})
