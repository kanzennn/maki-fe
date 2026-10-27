import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type {
  AreaFormValues,
  DineInMode,
  Draft,
  ScheduleListState,
  ScheduleSubmission,
  TableFormValues,
} from '@/modules/table/types'
import { cancelSchedule } from '@/modules/table/usecases/cancel-schedule.usecase'
import { createArea } from '@/modules/table/usecases/create-area.usecase'
import { createSchedule } from '@/modules/table/usecases/create-schedule.usecase'
import { createTable } from '@/modules/table/usecases/create-table.usecase'
import { deleteArea } from '@/modules/table/usecases/delete-area.usecase'
import { deleteTable } from '@/modules/table/usecases/delete-table.usecase'
import { getDineInMode } from '@/modules/table/usecases/get-dine-in-mode.usecase'
import { getFloor } from '@/modules/table/usecases/get-floor.usecase'
import { getLayout } from '@/modules/table/usecases/get-layout.usecase'
import { getSchedule } from '@/modules/table/usecases/get-schedule.usecase'
import { listAllAreas } from '@/modules/table/usecases/list-all-areas.usecase'
import { listAllTables } from '@/modules/table/usecases/list-all-tables.usecase'
import { listSchedules } from '@/modules/table/usecases/list-schedules.usecase'
import { releaseTable } from '@/modules/table/usecases/release-table.usecase'
import { reorderAreas } from '@/modules/table/usecases/reorder-areas.usecase'
import { saveLayout } from '@/modules/table/usecases/save-layout.usecase'
import { setDineInMode } from '@/modules/table/usecases/set-dine-in-mode.usecase'
import { setTableActive } from '@/modules/table/usecases/set-table-active.usecase'
import { updateArea } from '@/modules/table/usecases/update-area.usecase'
import { updateSchedule } from '@/modules/table/usecases/update-schedule.usecase'
import { updateTable } from '@/modules/table/usecases/update-table.usecase'

/** Every area of an outlet, in order. Reordering needs them all. */
export const allAreasQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.tables.areas(outletId), 'all'] as const,
    queryFn: () => listAllAreas(outletId),
  })

/** How the outlet seats its dine-in customers: at its tables, or by number stands. */
export const dineInModeQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.mode(outletId),
    queryFn: () => getDineInMode(outletId),
  })

/**
 * Seats the outlet's dine-in customers another way, from its next sale on.
 * The cashier's floor and catalog follow: they show tables, or ask for the
 * stand's number.
 */
export function useSetDineInMode(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mode: DineInMode) => setDineInMode(outletId, mode),
    onSuccess: (mode) => {
      queryClient.setQueryData(queryKeys.tables.mode(outletId), mode)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tables.floor(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog(outletId) })
    },
  })
}

/** An area's canvas: its decorations, and its tables with their statuses. */
export const layoutQuery = (outletId: string, areaId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.layout(outletId, areaId),
    queryFn: () => getLayout(outletId, areaId),
  })

/** Every table of an outlet, by area and then by name: a schedule picks from all of them. */
export const allTablesQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.tables.lists(outletId), 'all'] as const,
    queryFn: () => listAllTables(outletId),
  })

export const scheduleListQuery = (outletId: string, state: ScheduleListState) =>
  queryOptions({
    queryKey: [...queryKeys.tables.schedules(outletId), 'list', state] as const,
    queryFn: () => listSchedules(outletId, state),
  })

export const scheduleQuery = (outletId: string, scheduleId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.schedule(outletId, scheduleId),
    queryFn: () => getSchedule(outletId, scheduleId),
  })

/**
 * The outlet's tables as the cashier picks from them. A status changes with
 * every sale, so the floor is loaded again each time it's shown, after a
 * sale, a void or a release, and every half minute.
 */
export const floorQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.floor(outletId),
    queryFn: () => getFloor(outletId),
    staleTime: 0,
    refetchInterval: 30_000,
  })

/**
 * After any change: the outlet's areas, tables, layouts and schedules, and
 * the cashier's floor, which all show one another.
 */
function useTablesChanged(outletId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.tables.all(outletId) })
}

export function useCreateArea(outletId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (values: AreaFormValues) => createArea(outletId, values),
    onSuccess: changed,
  })
}

export function useUpdateArea(outletId: string, areaId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (values: AreaFormValues) => updateArea(outletId, areaId, values),
    onSuccess: changed,
  })
}

/**
 * Puts the areas in the order of areaIds, which lists every one of them
 * once. The list takes the new order at once, and goes back if the server
 * refuses it. A 409 areas_changed means one was added or deleted meanwhile:
 * the list is loaded again either way.
 */
export function useReorderAreas(outletId: string) {
  const queryClient = useQueryClient()
  const changed = useTablesChanged(outletId)
  const { queryKey } = allAreasQuery(outletId)
  return useMutation({
    mutationFn: (areaIds: string[]) => reorderAreas(outletId, areaIds),
    onMutate: async (areaIds) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData(queryKey)
      if (before) {
        const byId = new Map(before.map((area) => [area.area_id, area]))
        const reordered = areaIds.flatMap((id, index) => {
          const area = byId.get(id)
          return area ? [{ ...area, sort_order: index }] : []
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

export function useDeleteArea(outletId: string, areaId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: () => deleteArea(outletId, areaId),
    onSuccess: changed,
  })
}

export function useCreateTable(outletId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (values: TableFormValues) => createTable(outletId, values),
    onSuccess: changed,
  })
}

export function useUpdateTable(outletId: string, tableId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (values: TableFormValues) => updateTable(outletId, tableId, values),
    onSuccess: changed,
  })
}

export function useSetTableActive(outletId: string, tableId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (isActive: boolean) => setTableActive(outletId, tableId, isActive),
    onSuccess: changed,
  })
}

export function useDeleteTable(outletId: string, tableId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: () => deleteTable(outletId, tableId),
    onSuccess: changed,
  })
}

/** Customers have left the table: it's free again, wherever it shows. */
export function useReleaseTable(outletId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (tableId: string) => releaseTable(outletId, tableId),
    onSuccess: changed,
  })
}

/** Saves an area's whole layout, on the version the editor opened. */
export function useSaveLayout(outletId: string, areaId: string) {
  const queryClient = useQueryClient()
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (draft: Draft) => saveLayout(outletId, areaId, draft),
    onSuccess: (layout) => {
      queryClient.setQueryData(queryKeys.tables.layout(outletId, areaId), layout)
      void changed()
    },
  })
}

export function useCreateSchedule(outletId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (submission: ScheduleSubmission) => createSchedule(outletId, submission),
    onSuccess: changed,
  })
}

export function useUpdateSchedule(outletId: string, scheduleId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (submission: ScheduleSubmission) => updateSchedule(outletId, scheduleId, submission),
    onSuccess: changed,
  })
}

/** Cancels a schedule that isn't over: its tables are back in service. */
export function useCancelSchedule(outletId: string, scheduleId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: () => cancelSchedule(outletId, scheduleId),
    onSuccess: changed,
  })
}
