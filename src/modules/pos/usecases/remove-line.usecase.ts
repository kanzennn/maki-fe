import type { CartLine } from '../types'

export function removeLine(lines: CartLine[], menuId: string): CartLine[] {
  return lines.filter((l) => l.menuId !== menuId)
}
