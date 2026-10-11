import { beforeEach, describe, expect, it } from 'vitest'

import type { PosMenu } from './api'
import { addOne, MAX_LINES, MAX_QTY, maxQty, reconcile, removeLine, setNote, setQty, useCart, type CartLine } from './cart'

const menu = (over: Partial<PosMenu> = {}): PosMenu => ({
  menu_id: 'kopi',
  category_id: 'c1',
  name: 'Kopi',
  description: null,
  sku: null,
  price: 18000,
  image_url: null,
  track_stock: true,
  stock_qty: 3,
  stock_alert: null,
  stock_status: 'ok',
  ...over,
})

const line = (over: Partial<CartLine> = {}): CartLine => ({ menuId: 'kopi', name: 'Kopi', qty: 1, note: '', ...over })

describe('maxQty', () => {
  it('is the stock of a tracked menu, and 999 otherwise', () => {
    expect(maxQty(menu({ stock_qty: 3 }))).toBe(3)
    expect(maxQty(menu({ stock_qty: 0 }))).toBe(0)
    expect(maxQty(menu({ stock_qty: -2 }))).toBe(0)
    expect(maxQty(menu({ stock_qty: 5000 }))).toBe(MAX_QTY)
    expect(maxQty(menu({ track_stock: false, stock_qty: null }))).toBe(MAX_QTY)
  })
})

describe('addOne', () => {
  it('starts a line, then adds to it, up to the stock', () => {
    let lines = addOne([], menu())
    expect(lines).toEqual([line()])
    lines = addOne(lines, menu())
    lines = addOne(lines, menu())
    expect(lines).toEqual([line({ qty: 3 })])
    expect(addOne(lines, menu())).toEqual([line({ qty: 3 })])
  })

  it("can't add a menu that has none left", () => {
    expect(addOne([], menu({ stock_qty: 0, stock_status: 'out' }))).toEqual([])
  })

  it('stops at the most lines an order has', () => {
    const full = Array.from({ length: MAX_LINES }, (_, i) => line({ menuId: `m${i}` }))
    expect(addOne(full, menu())).toBe(full)
  })
})

describe('setQty', () => {
  it('keeps a line between 1 and the stock, and 0 takes it out', () => {
    const lines = [line({ qty: 2 })]
    expect(setQty(lines, menu(), 3)).toEqual([line({ qty: 3 })])
    expect(setQty(lines, menu(), 10)).toEqual([line({ qty: 3 })])
    expect(setQty(lines, menu(), 0)).toEqual([])
    expect(setQty(lines, menu({ stock_qty: 0 }), 1)).toEqual([])
  })
})

describe('setNote and removeLine', () => {
  it('note a line, at most 100 characters, or take it out', () => {
    const lines = [line(), line({ menuId: 'teh', name: 'Teh' })]
    expect(setNote(lines, 'teh', 'less sugar')[1].note).toBe('less sugar')
    expect(setNote(lines, 'teh', 'x'.repeat(150))[1].note).toHaveLength(100)
    expect(removeLine(lines, 'kopi')).toEqual([line({ menuId: 'teh', name: 'Teh' })])
  })
})

describe('reconcile', () => {
  it('drops what is no longer on sale or has none left, and cuts what is short', () => {
    const menus = new Map([
      ['kopi', menu({ stock_qty: 2 })],
      ['teh', menu({ menu_id: 'teh', track_stock: false, stock_qty: null })],
      ['roti', menu({ menu_id: 'roti', stock_qty: 0, stock_status: 'out' })],
    ])
    const lines = [
      line({ qty: 5 }),
      line({ menuId: 'teh', name: 'Teh', qty: 4 }),
      line({ menuId: 'roti', name: 'Roti' }),
      line({ menuId: 'gone', name: 'Jus' }),
    ]
    const result = reconcile(lines, menus)
    expect(result.lines).toEqual([line({ qty: 2 }), line({ menuId: 'teh', name: 'Teh', qty: 4 })])
    expect(result.removed.map((l) => l.name)).toEqual(['Roti', 'Jus'])
    expect(result.reduced).toEqual([{ line: line({ qty: 5 }), qty: 2 }])
  })

  it('leaves an order that still fits as it is', () => {
    const result = reconcile([line({ qty: 2 })], new Map([['kopi', menu()]]))
    expect(result).toEqual({ lines: [line({ qty: 2 })], removed: [], reduced: [] })
  })
})

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
