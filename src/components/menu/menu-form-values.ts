import type { Menu, MenuFormValues } from '@/modules/menu/types'

/** The menu form's starting values: a menu's, numbers as their digits, or a new menu's. */
export function menuFormValues(menu?: Menu): MenuFormValues {
  return {
    name: menu?.name ?? '',
    category_id: menu?.category.category_id ?? '',
    price: menu ? String(menu.price) : '',
    description: menu?.description ?? '',
    sku: menu?.sku ?? '',
    track_stock: menu?.track_stock ?? false,
    initial_stock: '',
    stock_alert: menu?.stock_alert != null ? String(menu.stock_alert) : '',
    is_active: menu?.is_active ?? true,
  }
}
