import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type Category = components['schemas']['Category']
export type CategoryInput = components['schemas']['CategoryInput']
export type Menu = components['schemas']['Menu']
export type MenuInput = components['schemas']['MenuInput']
export type StockStatus = components['schemas']['StockStatus']
export type StockMovement = components['schemas']['StockMovement']
export type StockAdjustment = components['schemas']['StockAdjustmentInput']

/** The menu list's search, from the address bar. */
export type MenuSearch = {
  q?: string
  category_id?: string
  status?: 'active' | 'inactive'
  stock?: StockStatus
  page?: number
}

/**
 * Every category of an outlet, in the cashier's order: the API's largest
 * page, which an outlet's categories don't fill. Reordering needs them all.
 */
export const allCategoriesQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.categories.lists(outletId), 'all'] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/outlets/{oid}/categories', { params: { path: { oid: outletId }, query: { page_size: 100 } } }),
      ),
    select: (list) => list.data,
  })

export const menuListQuery = (outletId: string, search: MenuSearch) =>
  queryOptions({
    queryKey: [...queryKeys.menus.lists(outletId), search] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/menus', { params: { path: { oid: outletId }, query: search } })),
  })

export const menuQuery = (outletId: string, menuId: string) =>
  queryOptions({
    queryKey: queryKeys.menus.detail(outletId, menuId),
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/menus/{mid}', { params: { path: { oid: outletId, mid: menuId } } })),
  })

/** A page of the menu's stock history, newest first. */
export const stockMovementsQuery = (outletId: string, menuId: string, page?: number) =>
  queryOptions({
    queryKey: [...queryKeys.menus.movements(outletId, menuId), { page }] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/outlets/{oid}/menus/{mid}/stock-movements', {
          params: { path: { oid: outletId, mid: menuId }, query: { page } },
        }),
      ),
  })

/**
 * After a category changes: the categories, and the menus, whose rows show
 * their category's name, icon and status, in its order.
 */
function useCategoriesChanged(outletId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.menus.all(outletId) })
  }
}

export function useCreateCategory(outletId: string) {
  const changed = useCategoriesChanged(outletId)
  return useMutation({
    mutationFn: (body: CategoryInput) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/categories', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateCategory(outletId: string, categoryId: string) {
  const changed = useCategoriesChanged(outletId)
  return useMutation({
    mutationFn: (body: CategoryInput) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/categories/{cid}', {
          params: { path: { oid: outletId, cid: categoryId } },
          body,
        }),
      ),
    onSuccess: changed,
  })
}

export function useSetCategoryActive(outletId: string, categoryId: string) {
  const changed = useCategoriesChanged(outletId)
  return useMutation({
    mutationFn: (active: boolean) =>
      unwrap(
        api.PATCH('/api/v1/outlets/{oid}/categories/{cid}/status', {
          params: { path: { oid: outletId, cid: categoryId } },
          body: { is_active: active },
        }),
      ),
    onSuccess: changed,
  })
}

/**
 * Puts every category of the outlet in the order given. The list takes the
 * new order at once, and goes back if the server refuses it. A 409
 * categories_changed means one was added or deleted meanwhile: the list is
 * loaded again either way.
 */
export function useReorderCategories(outletId: string) {
  const queryClient = useQueryClient()
  const changed = useCategoriesChanged(outletId)
  const { queryKey } = allCategoriesQuery(outletId)
  return useMutation({
    mutationFn: (categoryIds: string[]) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/categories/order', {
          params: { path: { oid: outletId } },
          body: { category_ids: categoryIds },
        }),
      ),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData(queryKey)
      if (before) {
        const byId = new Map(before.data.map((category) => [category.category_id, category]))
        const data = categoryIds.flatMap((id, index) => {
          const category = byId.get(id)
          return category ? [{ ...category, sort_order: index }] : []
        })
        queryClient.setQueryData(queryKey, { ...before, data })
      }
      return { before }
    },
    onError: (_error, _ids, context) => {
      if (context?.before) queryClient.setQueryData(queryKey, context.before)
    },
    onSettled: changed,
  })
}

export function useDeleteCategory(outletId: string, categoryId: string) {
  const changed = useCategoriesChanged(outletId)
  return useMutation({
    mutationFn: () =>
      unwrap(
        api.DELETE('/api/v1/outlets/{oid}/categories/{cid}', { params: { path: { oid: outletId, cid: categoryId } } }),
      ),
    onSuccess: changed,
  })
}

/**
 * After a menu changes: its page, the lists, its stock history (tracking
 * that starts records the starting count), and the categories' menu counts.
 */
function useMenuChanged(outletId: string) {
  const queryClient = useQueryClient()
  return (menu: Menu) => {
    queryClient.setQueryData(queryKeys.menus.detail(outletId, menu.menu_id), menu)
    void queryClient.invalidateQueries({ queryKey: queryKeys.menus.lists(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.menus.movements(outletId, menu.menu_id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all(outletId) })
  }
}

export function useCreateMenu(outletId: string) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (body: MenuInput) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/menus', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateMenu(outletId: string, menuId: string) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (body: MenuInput) =>
      unwrap(api.PUT('/api/v1/outlets/{oid}/menus/{mid}', { params: { path: { oid: outletId, mid: menuId } }, body })),
    onSuccess: changed,
  })
}

export function useSetMenuActive(outletId: string, menuId: string) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (active: boolean) =>
      unwrap(
        api.PATCH('/api/v1/outlets/{oid}/menus/{mid}/status', {
          params: { path: { oid: outletId, mid: menuId } },
          body: { is_active: active },
        }),
      ),
    onSuccess: changed,
  })
}

/**
 * Deletes the menu. Its page is still open when this resolves: the caller
 * leaves it, then forgets the menu with useForgetMenu.
 */
export function useDeleteMenu(outletId: string, menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE('/api/v1/outlets/{oid}/menus/{mid}', { params: { path: { oid: outletId, mid: menuId } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.menus.lists(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all(outletId) })
    },
  })
}

export function useForgetMenu(outletId: string) {
  const queryClient = useQueryClient()
  return (menuId: string) => {
    queryClient.removeQueries({ queryKey: queryKeys.menus.detail(outletId, menuId) })
    queryClient.removeQueries({ queryKey: queryKeys.menus.movements(outletId, menuId) })
  }
}

/**
 * Adds to, takes from or counts the menu's stock. The answer is the menu as
 * the adjustment left it; a 409 stock_insufficient means the count changed
 * meanwhile, so the menu is loaded again.
 */
export function useAdjustStock(outletId: string, menuId: string) {
  const changed = useMenuChanged(outletId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StockAdjustment) =>
      unwrap(
        api.POST('/api/v1/outlets/{oid}/menus/{mid}/stock-adjustments', {
          params: { path: { oid: outletId, mid: menuId } },
          body,
        }),
      ),
    onSuccess: changed,
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.menus.detail(outletId, menuId) }),
  })
}

export function useSetStockAlert(outletId: string, menuId: string) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (alert: number | null) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/menus/{mid}/stock-alert', {
          params: { path: { oid: outletId, mid: menuId } },
          body: { stock_alert: alert },
        }),
      ),
    onSuccess: changed,
  })
}
