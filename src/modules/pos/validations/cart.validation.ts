import { MAX_QTY, type PosMenu } from '../types'

/** The most of a menu one order can take: its stock when tracked, and never past the server's limit. */
export function maxQty(menu: Pick<PosMenu, 'track_stock' | 'stock_qty'>): number {
  return menu.track_stock ? Math.min(Math.max(menu.stock_qty ?? 0, 0), MAX_QTY) : MAX_QTY
}
