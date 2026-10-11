import type { PosMenu } from './api'

/**
 * The catalog's menus in one category, or in all, whose name or SKU holds
 * the search, in any case. They keep the catalog's order: filtering never
 * moves a menu out of stock up.
 */
export function shown(menus: PosMenu[], category: string | null, search: string): PosMenu[] {
  const q = search.trim().toLocaleLowerCase()
  return menus.filter(
    (m) =>
      (category === null || m.category_id === category) &&
      (q === '' || m.name.toLocaleLowerCase().includes(q) || (m.sku?.toLocaleLowerCase().includes(q) ?? false)),
  )
}
