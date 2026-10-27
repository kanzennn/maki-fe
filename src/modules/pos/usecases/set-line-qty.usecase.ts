import type { CartLine, PosMenu } from '../types'
import { maxQty } from '../validations/cart.validation'
import { removeLine } from './remove-line.usecase'

/** The menu's line at qty, kept between 1 and what there is; 0 takes it out. */
export function setQty(lines: CartLine[], menu: PosMenu, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, menu.menu_id)
  const capped = Math.min(Math.floor(qty), maxQty(menu))
  if (capped < 1) return removeLine(lines, menu.menu_id)
  return lines.map((l) => (l.menuId === menu.menu_id ? { ...l, qty: capped } : l))
}
