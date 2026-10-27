import type { components } from '@/lib/api-schema'

export type Category = components['schemas']['Category']
export type CategoryInput = components['schemas']['CategoryInput']
export type Menu = components['schemas']['Menu']
export type MenuInput = components['schemas']['MenuInput']
export type StockStatus = components['schemas']['StockStatus']
export type StockMovement = components['schemas']['StockMovement']
export type StockAdjustment = components['schemas']['StockAdjustmentInput']
export type AdjustmentType = StockAdjustment['type']
export type AdjustmentReason = StockAdjustment['reason']

export const menuStatuses = ['active', 'inactive'] as const
export const stockStatuses = ['ok', 'low', 'out', 'untracked'] as const satisfies readonly StockStatus[]
export const adjustmentReasons = ['restock', 'damaged', 'correction', 'other'] as const satisfies readonly AdjustmentReason[]

/** Rupiah, the most a menu may cost. */
export const MAX_PRICE = 100_000_000
/** The most a count, an alert or one adjustment may be. */
export const MAX_STOCK = 1_000_000

/** The reason an adjustment of each type most often has, picked to start with. */
export const usualReason: Record<AdjustmentType, AdjustmentReason> = {
  in: 'restock',
  out: 'damaged',
  set: 'correction',
}

/** The menu list as the page shows it: search text, category, status, stock, page. */
export type MenuListState = {
  q?: string
  category_id?: string
  status?: (typeof menuStatuses)[number]
  stock?: StockStatus
  page?: number
}

/** A menu's stock history as its page shows it: which page. */
export type StockHistoryState = { page?: number }

/** A category's form, as typed. */
export type CategoryFormValues = { name: string; icon: string }

export const categoryFields = ['name', 'icon'] as const satisfies readonly (keyof CategoryFormValues)[]

/**
 * A menu as the form holds it: numbers as the digits typed. Tracking starts
 * from initial_stock, for a menu that didn't track its stock yet.
 */
export type MenuFormValues = {
  name: string
  category_id: string
  price: string
  description: string
  sku: string
  track_stock: boolean
  initial_stock: string
  stock_alert: string
  is_active: boolean
}

export const menuFields = [
  'name',
  'category_id',
  'price',
  'description',
  'sku',
  'track_stock',
  'initial_stock',
  'stock_alert',
] as const satisfies readonly (keyof MenuFormValues)[]

/** A stock adjustment, as typed: the count as digits. */
export type AdjustmentFormValues = { type: AdjustmentType; qty: string; reason: AdjustmentReason; note: string }

export const adjustmentFields = ['type', 'qty', 'reason', 'note'] as const satisfies readonly (keyof AdjustmentFormValues)[]

/** A menu's low-stock alert, as typed: empty for none. */
export type StockAlertFormValues = { stock_alert: string }
