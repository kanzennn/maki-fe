import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Category, CategoryInput } from '../types'

export function listCategories(
  outletId: string,
  params: QueryParams<'/outlets/{oid}/categories'>,
): Promise<Page<Category>> {
  return http.getPaginated<Category>(apiPath('/outlets/{oid}/categories', { oid: outletId }), params)
}

export function createCategory(outletId: string, body: CategoryInput): Promise<Category> {
  return http.post<Category>(apiPath('/outlets/{oid}/categories', { oid: outletId }), body)
}

export function updateCategory(outletId: string, categoryId: string, body: CategoryInput): Promise<Category> {
  return http.put<Category>(apiPath('/outlets/{oid}/categories/{cid}', { oid: outletId, cid: categoryId }), body)
}

export function setCategoryActive(outletId: string, categoryId: string, active: boolean): Promise<Category> {
  return http.patch<Category>(apiPath('/outlets/{oid}/categories/{cid}/status', { oid: outletId, cid: categoryId }), {
    is_active: active,
  })
}

/** Puts every category of the outlet in the order given. */
export function reorderCategories(outletId: string, categoryIds: string[]): Promise<void> {
  return http.put(apiPath('/outlets/{oid}/categories/order', { oid: outletId }), { category_ids: categoryIds })
}

export function deleteCategory(outletId: string, categoryId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/categories/{cid}', { oid: outletId, cid: categoryId }))
}
