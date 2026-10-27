import type { CartLine, PosMenu, Reconciled } from '../types'
import { maxQty } from '../validations/cart.validation'

/**
 * The cart against the catalog: a line whose menu is gone from it, or has
 * none left, comes out, and one for more than there is is cut to what there
 * is. Prices aren't in the cart; they are always the catalog's.
 */
export function reconcile(lines: CartLine[], menus: Map<string, PosMenu>): Reconciled {
  const out: Reconciled = { lines: [], removed: [], reduced: [] }
  for (const line of lines) {
    const menu = menus.get(line.menuId)
    const most = menu ? maxQty(menu) : 0
    if (most < 1) {
      out.removed.push(line)
    } else if (line.qty > most) {
      out.reduced.push({ line, qty: most })
      out.lines.push({ ...line, qty: most })
    } else {
      out.lines.push(line)
    }
  }
  return out
}
