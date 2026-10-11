import { describe, expect, it } from 'vitest'

import { testMenus } from '@/test/fixtures'

import {
  adjustmentSchema,
  categorySchema,
  emojiLike,
  MAX_PRICE,
  MAX_STOCK,
  menuSchema,
  menuValues,
  stockAfter,
  toAdjustment,
  toMenuInput,
  type AdjustmentValues,
  type MenuValues,
} from './schemas'

/** The rule each field broke, as the form shows them. */
function broken(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]))
}

describe('category icons', () => {
  it('takes emoji of every shape', () => {
    for (const icon of ['🧋', '🧑‍🍳', '🇮🇩', '1️⃣', '❤️', '👍🏽', '☕']) expect(emojiLike(icon), icon).toBe(true)
  })

  it('refuses words, spaces, and characters that are no pictograph', () => {
    for (const icon of ['kopi', '🍜 🍜', '??', '12', '茶', '*']) expect(emojiLike(icon), icon).toBe(false)
  })

  it('counts characters as the server does', () => {
    expect(broken(categorySchema.safeParse({ name: '🍜'.repeat(50), icon: '🧑‍🍳' }))).toEqual({})
    expect(broken(categorySchema.safeParse({ name: 'n'.repeat(51), icon: '🍜'.repeat(9) }))).toEqual({
      name: 'max',
      icon: 'max',
    })
    expect(broken(categorySchema.safeParse({ name: '  ', icon: '??' }))).toEqual({ name: 'required', icon: 'format' })
  })
})

const menu = (values: Partial<MenuValues>): MenuValues => ({ ...menuValues(), category_id: 'c-drinks', name: 'Es Jeruk', price: '8000', ...values })

describe('the menu form', () => {
  it('takes prices up to Rp 100.000.000', () => {
    const schema = menuSchema(false)
    expect(broken(schema.safeParse(menu({ price: String(MAX_PRICE) })))).toEqual({})
    expect(broken(schema.safeParse(menu({ price: String(MAX_PRICE + 1) })))).toEqual({ price: 'range' })
    expect(broken(schema.safeParse(menu({ price: '' })))).toEqual({ price: 'required' })
  })

  it("checks the SKU's letters, the lengths, and the category", () => {
    expect(
      broken(
        menuSchema(false).safeParse(
          menu({ sku: 'KOPI 01', name: '🍜'.repeat(101), description: 'd'.repeat(501), category_id: '' }),
        ),
      ),
    ).toEqual({ sku: 'format', name: 'max', description: 'max', category_id: 'required' })
    expect(broken(menuSchema(false).safeParse(menu({ sku: 'kopi_01.v2-B', name: '🍜'.repeat(100) })))).toEqual({})
  })

  it('needs the count that tracking starts from, and only then', () => {
    expect(broken(menuSchema(false).safeParse(menu({ track_stock: true })))).toEqual({ initial_stock: 'required' })
    expect(broken(menuSchema(false).safeParse(menu({ track_stock: true, initial_stock: '0' })))).toEqual({})
    // Tracked already: the count changes through adjustments.
    expect(broken(menuSchema(true).safeParse(menu({ track_stock: true })))).toEqual({})
    expect(
      broken(menuSchema(false).safeParse(menu({ track_stock: true, initial_stock: '1000001', stock_alert: '1000001' }))),
    ).toEqual({ initial_stock: 'range', stock_alert: 'range' })
  })

  it('sends the count only when tracking starts, the alert only when tracked, the status only when new', () => {
    expect(toMenuInput(menu({ track_stock: true, initial_stock: '10', stock_alert: '3', sku: ' ' }))).toEqual({
      name: 'Es Jeruk',
      category_id: 'c-drinks',
      price: 8000,
      description: null,
      sku: null,
      track_stock: true,
      initial_stock: 10,
      stock_alert: 3,
      is_active: true,
    })
    const bolu = testMenus[1]
    expect(toMenuInput({ ...menuValues(bolu), initial_stock: '99' }, bolu)).toMatchObject({
      initial_stock: null,
      stock_alert: 3,
      is_active: null,
    })
    expect(toMenuInput({ ...menuValues(bolu), track_stock: false }, bolu)).toMatchObject({
      track_stock: false,
      stock_alert: null,
    })
  })
})

const adjustment = (values: Partial<AdjustmentValues>): AdjustmentValues => ({
  type: 'in',
  qty: '1',
  reason: 'restock',
  note: '',
  ...values,
})

describe('a stock adjustment', () => {
  const schema = adjustmentSchema(10)

  it('never takes more than there is', () => {
    expect(broken(schema.safeParse(adjustment({ type: 'out', qty: '10' })))).toEqual({})
    expect(broken(schema.safeParse(adjustment({ type: 'out', qty: '11' })))).toEqual({ qty: 'insufficient' })
  })

  it('adds or takes something, lets a stock take find none, and stays under the most a count may be', () => {
    expect(broken(schema.safeParse(adjustment({ type: 'in', qty: '0' })))).toEqual({ qty: 'range' })
    expect(broken(schema.safeParse(adjustment({ type: 'out', qty: '0' })))).toEqual({ qty: 'range' })
    expect(broken(schema.safeParse(adjustment({ type: 'set', qty: '0' })))).toEqual({})
    expect(broken(schema.safeParse(adjustment({ type: 'set', qty: String(MAX_STOCK) })))).toEqual({})
    expect(broken(schema.safeParse(adjustment({ type: 'in', qty: String(MAX_STOCK - 9) })))).toEqual({ qty: 'range' })
    expect(broken(schema.safeParse(adjustment({ qty: '' })))).toEqual({ qty: 'required' })
  })

  it('needs a note for the reason Other', () => {
    expect(broken(schema.safeParse(adjustment({ reason: 'other', note: '  ' })))).toEqual({ note: 'required' })
    expect(broken(schema.safeParse(adjustment({ reason: 'other', note: 'Dipakai acara' })))).toEqual({})
    expect(broken(schema.safeParse(adjustment({ note: '🍰'.repeat(201) })))).toEqual({ note: 'max' })
  })

  it('works out the count it leaves, and sends numbers', () => {
    expect([stockAfter(10, 'in', 5), stockAfter(10, 'out', 3), stockAfter(10, 'set', 4)]).toEqual([15, 7, 4])
    expect(toAdjustment(adjustment({ type: 'out', qty: '3', reason: 'damaged', note: ' Basi ' }))).toEqual({
      type: 'out',
      qty: 3,
      reason: 'damaged',
      note: 'Basi',
    })
  })
})
