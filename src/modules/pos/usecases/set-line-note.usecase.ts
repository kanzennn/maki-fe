import { MAX_NOTE, type CartLine } from '../types'

/** The customer's wish for a line, cut to the most the server keeps. */
export function setNote(lines: CartLine[], menuId: string, note: string): CartLine[] {
  return lines.map((l) => (l.menuId === menuId ? { ...l, note: note.slice(0, MAX_NOTE) } : l))
}
