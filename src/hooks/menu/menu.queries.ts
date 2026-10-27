import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type {
  AdjustmentFormValues,
  CategoryFormValues,
  Menu,
  MenuFormValues,
  MenuListState,
  StockAlertFormValues,
  StockHistoryState,
} from '@/modules/menu/types'
import { adjustStock } from '@/modules/menu/usecases/adjust-stock.usecase'
import { createCategory } from '@/modules/menu/usecases/create-category.usecase'
import { createMenu } from '@/modules/menu/usecases/create-menu.usecase'
import { deleteCategory } from '@/modules/menu/usecases/delete-category.usecase'
import { deleteMenu } from '@/modules/menu/usecases/delete-menu.usecase'
import { getMenu } from '@/modules/menu/usecases/get-menu.usecase'
import { listAllCategories } from '@/modules/menu/usecases/list-all-categories.usecase'
import { listMenus } from '@/modules/menu/usecases/list-menus.usecase'
import { listStockMovements } from '@/modules/menu/usecases/list-stock-movements.usecase'
import { reorderCategories } from '@/modules/menu/usecases/reorder-categories.usecase'
import { setCategoryActive } from '@/modules/menu/usecases/set-category-active.usecase'
import { setMenuActive } from '@/modules/menu/usecases/set-menu-active.usecase'
import { setStockAlert } from '@/modules/menu/usecases/set-stock-alert.usecase'
import { updateCategory } from '@/modules/menu/usecases/update-category.usecase'
import { updateMenu } from '@/modules/menu/usecases/update-menu.usecase'

/** Every category of an outlet, in the cashier's order. */
export const allCategoriesQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.categories.lists(outletId), 'all'] as const,
    queryFn: () => listAllCategories(outletId),
  })

export const menuListQuery = (outletId: string, state: MenuListState) =>
  queryOptions({
    queryKey: [...queryKeys.menus.lists(outletId), state] as const,
    queryFn: () => listMenus(outletId, state),
  })

export const menuQuery = (outletId: string, menuId: string) =>
  queryOptions({
    queryKey: queryKeys.menus.detail(outletId, menuId),
    queryFn: () => getMenu(outletId, menuId),
  })

/** A page of the menu's stock history, newest first. */
export const stockMovementsQuery = (outletId: string, menuId: string, state: StockHistoryState) =>
  queryOptions({
    queryKey: [...queryKeys.menus.movements(outletId, menuId), state] as const,
    queryFn: () => listStockMovements(outletId, menuId, state),
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
    mutationFn: (values: CategoryFormValues) => createCategory(outletId, values),
    onSuccess: changed,
  })
}

export function useUpdateCategory(outletId: string, categoryId: string) {
  const changed = useCategoriesChanged(outletId)
  return useMutation({
    mutationFn: (values: CategoryFormValues) => updateCategory(outletId, categoryId, values),
    onSuccess: changed,
  })
}

export function useSetCategoryActive(outletId: string, categoryId: string) {
  const changed = useCategoriesChanged(outletId)
  return useMutation({
    mutationFn: (active: boolean) => setCategoryActive(outletId, categoryId, active),
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
    mutationFn: (categoryIds: string[]) => reorderCategories(outletId, categoryIds),
    onMutate: async (categoryIds) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData(queryKey)
      if (before) {
        const byId = new Map(before.map((category) => [category.category_id, category]))
        const reordered = categoryIds.flatMap((id, index) => {
          const category = byId.get(id)
          return category ? [{ ...category, sort_order: index }] : []
        })
        queryClient.setQueryData(queryKey, reordered)
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
    mutationFn: () => deleteCategory(outletId, categoryId),
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
    mutationFn: (values: MenuFormValues) => createMenu(outletId, values),
    onSuccess: changed,
  })
}

/** Saves the form of menu, as it stood when the form opened. */
export function useUpdateMenu(outletId: string, menu: Menu) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (values: MenuFormValues) => updateMenu(outletId, menu, values),
    onSuccess: changed,
  })
}

export function useSetMenuActive(outletId: string, menuId: string) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (active: boolean) => setMenuActive(outletId, menuId, active),
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
    mutationFn: () => deleteMenu(outletId, menuId),
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
 * Adjusts menu's stock. A refusal — a 409 stock_insufficient when the count
 * changed meanwhile — loads the menu again, so the dialog shows the new count.
 */
export function useAdjustStock(outletId: string, menu: Menu) {
  const changed = useMenuChanged(outletId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AdjustmentFormValues) => adjustStock(outletId, menu, values),
    onSuccess: changed,
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.menus.detail(outletId, menu.menu_id) }),
  })
}

export function useSetStockAlert(outletId: string, menuId: string) {
  const changed = useMenuChanged(outletId)
  return useMutation({
    mutationFn: (values: StockAlertFormValues) => setStockAlert(outletId, menuId, values),
    onSuccess: changed,
  })
}
