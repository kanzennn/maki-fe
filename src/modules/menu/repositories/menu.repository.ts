import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Menu, MenuInput, StockAdjustment, StockMovement } from '../types'

export function listMenus(outletId: string, params: QueryParams<'/outlets/{oid}/menus'>): Promise<Page<Menu>> {
  return http.getPaginated<Menu>(apiPath('/outlets/{oid}/menus', { oid: outletId }), params)
}

export function getMenu(outletId: string, menuId: string): Promise<Menu> {
  return http.get<Menu>(apiPath('/outlets/{oid}/menus/{mid}', { oid: outletId, mid: menuId }))
}

export function createMenu(outletId: string, body: MenuInput): Promise<Menu> {
  return http.post<Menu>(apiPath('/outlets/{oid}/menus', { oid: outletId }), body)
}

export function updateMenu(outletId: string, menuId: string, body: MenuInput): Promise<Menu> {
  return http.put<Menu>(apiPath('/outlets/{oid}/menus/{mid}', { oid: outletId, mid: menuId }), body)
}

export function setMenuActive(outletId: string, menuId: string, active: boolean): Promise<Menu> {
  return http.patch<Menu>(apiPath('/outlets/{oid}/menus/{mid}/status', { oid: outletId, mid: menuId }), {
    is_active: active,
  })
}

export function deleteMenu(outletId: string, menuId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/menus/{mid}', { oid: outletId, mid: menuId }))
}

/** A page of the menu's stock history, newest first. */
export function listStockMovements(
  outletId: string,
  menuId: string,
  params: QueryParams<'/outlets/{oid}/menus/{mid}/stock-movements'>,
): Promise<Page<StockMovement>> {
  return http.getPaginated<StockMovement>(
    apiPath('/outlets/{oid}/menus/{mid}/stock-movements', { oid: outletId, mid: menuId }),
    params,
  )
}

/** The answer is the menu as the adjustment left it. */
export function adjustStock(outletId: string, menuId: string, body: StockAdjustment): Promise<Menu> {
  return http.post<Menu>(apiPath('/outlets/{oid}/menus/{mid}/stock-adjustments', { oid: outletId, mid: menuId }), body)
}

export function setStockAlert(outletId: string, menuId: string, alert: number | null): Promise<Menu> {
  return http.put<Menu>(apiPath('/outlets/{oid}/menus/{mid}/stock-alert', { oid: outletId, mid: menuId }), {
    stock_alert: alert,
  })
}
