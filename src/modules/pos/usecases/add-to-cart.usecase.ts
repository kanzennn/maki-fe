import { MAX_LINES, type CartLine, type PosMenu } from '../types'
import { maxQty } from '../validations/cart.validation'
import { setQty } from './set-line-qty.usecase'

/** One more of the menu: a new line, or one more on its line, up to what there is. */
export function addOne(lines: CartLine[], menu: PosMenu): CartLine[] {
  const line = lines.find((l) => l.menuId === menu.menu_id)
  if (line) return setQty(lines, menu, line.qty + 1)
  if (maxQty(menu) < 1 || lines.length >= MAX_LINES) return lines
  return [...lines, { menuId: menu.menu_id, name: menu.name, qty: 1, note: '' }]
}
