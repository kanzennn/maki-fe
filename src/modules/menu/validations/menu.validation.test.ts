import { describe, expect, it } from 'vitest'

import { ValidationError } from '@/lib/validation'
import { testMenus } from '@/test/fixtures'

import { MAX_PRICE, MAX_STOCK, type AdjustmentFormValues, type MenuFormValues } from '../types'
import { stockAfter } from '../usecases/stock-after.usecase'
import { emojiLike, validateCategoryForm } from './category.validation'
import { validateMenuForm } from './menu.validation'
import { validateAdjustment, validateStockAlert } from './stock.validation'

/** The rule each field broke, as the form shows them: nothing when it passes. */
function broken(validate: () => unknown): Record<string, string> {
  try {
    validate()
    return {}
  } catch (error) {
    if (error instanceof ValidationError) return { ...error.fields }
    throw error
  }
}

describe('category icons', () => {
  it('takes emoji of every shape', () => {
    for (const icon of ['🧋', '🧑‍🍳', '🇮🇩', '1️⃣', '❤️', '👍🏽', '☕']) expect(emojiLike(icon), icon).toBe(true)
  })

  it('refuses words, spaces, and characters that are no pictograph', () => {
    for (const icon of ['kopi', '🍜 🍜', '??', '12', '茶', '*']) expect(emojiLike(icon), icon).toBe(false)
  })

  it('counts characters as the server does', () => {
    expect(broken(() => validateCategoryForm({ name: '🍜'.repeat(50), icon: '🧑‍🍳' }))).toEqual({})
    expect(broken(() => validateCategoryForm({ name: 'n'.repeat(51), icon: '🍜'.repeat(9) }))).toEqual({
      name: 'max',
      icon: 'max',
    })
    expect(broken(() => validateCategoryForm({ name: '  ', icon: '??' }))).toEqual({ name: 'required', icon: 'format' })
  })

  it('sends a trimmed name, and no icon for an empty one', () => {
    expect(validateCategoryForm({ name: ' Minuman ', icon: ' ' })).toEqual({ name: 'Minuman', icon: null })
  })
})

const blank: MenuFormValues = {
  name: '',
  category_id: '',
  price: '',
  description: '',
  sku: '',
  track_stock: false,
  initial_stock: '',
  stock_alert: '',
  is_active: true,
}
const menu = (values: Partial<MenuFormValues>): MenuFormValues => ({
  ...blank,
  category_id: 'c-drinks',
  name: 'Es Jeruk',
  price: '8000',
  ...values,
})

describe('the menu form', () => {
  it('takes prices up to Rp 100.000.000', () => {
    expect(broken(() => validateMenuForm(menu({ price: String(MAX_PRICE) })))).toEqual({})
    expect(broken(() => validateMenuForm(menu({ price: String(MAX_PRICE + 1) })))).toEqual({ price: 'range' })
    expect(broken(() => validateMenuForm(menu({ price: '' })))).toEqual({ price: 'required' })
  })

  it("checks the SKU's letters, the lengths, and the category", () => {
    expect(
      broken(() =>
        validateMenuForm(menu({ sku: 'KOPI 01', name: '🍜'.repeat(101), description: 'd'.repeat(501), category_id: '' })),
      ),
    ).toEqual({ sku: 'format', name: 'max', description: 'max', category_id: 'required' })
    expect(broken(() => validateMenuForm(menu({ sku: 'kopi_01.v2-B', name: '🍜'.repeat(100) })))).toEqual({})
  })

  it('needs the count that tracking starts from, and only then', () => {
    expect(broken(() => validateMenuForm(menu({ track_stock: true })))).toEqual({ initial_stock: 'required' })
    expect(broken(() => validateMenuForm(menu({ track_stock: true, initial_stock: '0' })))).toEqual({})
    // Tracked already: the count changes through adjustments.
    expect(broken(() => validateMenuForm(menu({ track_stock: true }), { track_stock: true }))).toEqual({})
    expect(
      broken(() => validateMenuForm(menu({ track_stock: true, initial_stock: '1000001', stock_alert: '1000001' }))),
    ).toEqual({ initial_stock: 'range', stock_alert: 'range' })
  })

  it('sends the count only when tracking starts, the alert only when tracked, the status only when new', () => {
    expect(validateMenuForm(menu({ track_stock: true, initial_stock: '10', stock_alert: '3', sku: ' ' }))).toEqual({
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
    const asOpened: MenuFormValues = {
      name: bolu.name,
      category_id: bolu.category.category_id,
      price: String(bolu.price),
      description: bolu.description ?? '',
      sku: bolu.sku ?? '',
      track_stock: bolu.track_stock,
      initial_stock: '',
      stock_alert: bolu.stock_alert != null ? String(bolu.stock_alert) : '',
      is_active: bolu.is_active,
    }
    expect(validateMenuForm({ ...asOpened, initial_stock: '99' }, bolu)).toMatchObject({
      initial_stock: null,
      stock_alert: 3,
      is_active: null,
    })
    expect(validateMenuForm({ ...asOpened, track_stock: false }, bolu)).toMatchObject({
      track_stock: false,
      stock_alert: null,
    })
  })
})

const adjustment = (values: Partial<AdjustmentFormValues>): AdjustmentFormValues => ({
  type: 'in',
  qty: '1',
  reason: 'restock',
  note: '',
  ...values,
})

describe('a stock adjustment', () => {
  const at10 = (values: Partial<AdjustmentFormValues>) => broken(() => validateAdjustment(adjustment(values), 10))

  it('never takes more than there is', () => {
    expect(at10({ type: 'out', qty: '10' })).toEqual({})
    expect(at10({ type: 'out', qty: '11' })).toEqual({ qty: 'insufficient' })
  })

  it('adds or takes something, lets a stock take find none, and stays under the most a count may be', () => {
    expect(at10({ type: 'in', qty: '0' })).toEqual({ qty: 'range' })
    expect(at10({ type: 'out', qty: '0' })).toEqual({ qty: 'range' })
    expect(at10({ type: 'set', qty: '0' })).toEqual({})
    expect(at10({ type: 'set', qty: String(MAX_STOCK) })).toEqual({})
    expect(at10({ type: 'in', qty: String(MAX_STOCK - 9) })).toEqual({ qty: 'range' })
    expect(at10({ qty: '' })).toEqual({ qty: 'required' })
  })

  it('needs a note for the reason Other', () => {
    expect(at10({ reason: 'other', note: '  ' })).toEqual({ note: 'required' })
    expect(at10({ reason: 'other', note: 'Dipakai acara' })).toEqual({})
    expect(at10({ note: '🍰'.repeat(201) })).toEqual({ note: 'max' })
  })

  it('works out the count it leaves, and sends numbers', () => {
    expect([stockAfter(10, 'in', 5), stockAfter(10, 'out', 3), stockAfter(10, 'set', 4)]).toEqual([15, 7, 4])
    expect(validateAdjustment(adjustment({ type: 'out', qty: '3', reason: 'damaged', note: ' Basi ' }), 10)).toEqual({
      type: 'out',
      qty: 3,
      reason: 'damaged',
      note: 'Basi',
    })
  })
})

describe('the low-stock alert', () => {
  it('sends none for an empty field, and stays under the most a count may be', () => {
    expect(validateStockAlert({ stock_alert: '' })).toBeNull()
    expect(validateStockAlert({ stock_alert: '5' })).toBe(5)
    expect(broken(() => validateStockAlert({ stock_alert: String(MAX_STOCK + 1) }))).toEqual({ stock_alert: 'range' })
  })
})
