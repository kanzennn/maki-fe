import { describe, expect, it } from 'vitest'

import { MAX_LINES, MAX_QTY, type CartLine, type PosMenu } from '../types'
import { maxQty } from '../validations/cart.validation'
import { addOne } from './add-to-cart.usecase'
import { reconcile } from './reconcile-cart.usecase'
import { removeLine } from './remove-line.usecase'
import { setNote } from './set-line-note.usecase'
import { setQty } from './set-line-qty.usecase'

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
