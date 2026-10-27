import { describe, expect, it } from 'vitest'

import type { PosMenu } from '../types'
import { shown } from './browse-menus.usecase'

const menu = (menu_id: string, name: string, category_id: string, sku: string | null = null): PosMenu => ({
  menu_id,
  category_id,
  name,
  description: null,
  sku,
  price: 1000,
  image_url: null,
  track_stock: false,
  stock_qty: null,
  stock_alert: null,
  stock_status: 'untracked',
})

// In the catalog's order, out of stock last: filtering must keep it.
const menus = [
  menu('a', 'Es Kopi Susu', 'drinks', 'KOPI-01'),
  menu('b', 'Nasi Goreng', 'food'),
  menu('c', 'Kopi Hitam', 'drinks'),
]

describe('shown', () => {
  it('narrows to a category, keeping the order', () => {
    expect(shown(menus, 'drinks', '').map((m) => m.menu_id)).toEqual(['a', 'c'])
    expect(shown(menus, null, '').map((m) => m.menu_id)).toEqual(['a', 'b', 'c'])
  })

  it('searches the name and the SKU, in any case', () => {
    expect(shown(menus, null, 'kopi').map((m) => m.menu_id)).toEqual(['a', 'c'])
    expect(shown(menus, null, '  KOPI-0 ').map((m) => m.menu_id)).toEqual(['a'])
    expect(shown(menus, 'food', 'kopi')).toEqual([])
  })
})
