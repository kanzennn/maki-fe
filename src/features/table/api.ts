import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type Area = components['schemas']['Area']
export type AreaInput = components['schemas']['AreaInput']
export type Table = components['schemas']['Table']
export type TableInput = components['schemas']['TableInput']
export type TableShape = components['schemas']['TableShape']
export type TableStatus = components['schemas']['TableStatus']
export type Layout = components['schemas']['Layout']
export type LayoutInput = components['schemas']['LayoutInput']
export type Decoration = components['schemas']['Decoration']
export type DecorationKind = components['schemas']['DecorationKind']
export type Schedule = components['schemas']['Schedule']
export type ScheduleInput = components['schemas']['ScheduleInput']
export type ScheduleStatus = components['schemas']['ScheduleStatus']
export type DineInMode = components['schemas']['DineInMode']

export const tableShapes = ['square', 'round', 'rectangle'] as const satisfies readonly TableShape[]
export const scheduleStatuses = ['upcoming', 'ongoing', 'finished', 'cancelled'] as const satisfies readonly ScheduleStatus[]
export const dineInModes = ['table', 'number'] as const satisfies readonly DineInMode[]

/** The tables page's search, from the address bar: the area shown. */
export type TablesSearch = { area?: string }

/** A schedule list's search, from the address bar. */
export type ScheduleSearch = { status?: ScheduleStatus; page?: number }

/**
 * Every area of an outlet, in order: the API's largest page, which an
 * outlet's areas don't fill. Reordering needs them all.
 */
export const allAreasQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.tables.areas(outletId), 'all'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/areas', { params: { path: { oid: outletId }, query: { page_size: 100 } } })),
    select: (list) => list.data,
  })

/** How the outlet seats its dine-in customers: at its tables, or by number stands. */
export const dineInModeQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.mode(outletId),
    queryFn: () => unwrap(api.GET('/api/v1/outlets/{oid}/dine-in-mode', { params: { path: { oid: outletId } } })),
    select: (setting) => setting.mode,
  })

/**
 * Seats the outlet's dine-in customers another way, from its next sale on.
 * The cashier's floor and catalog follow: they show tables, or ask for the
 * stand's number.
 */
export function useSetDineInMode(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mode: DineInMode) =>
      unwrap(api.PUT('/api/v1/outlets/{oid}/dine-in-mode', { params: { path: { oid: outletId } }, body: { mode } })),
    onSuccess: (setting) => {
      queryClient.setQueryData(queryKeys.tables.mode(outletId), setting)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tables.floor(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog(outletId) })
    },
  })
}

/** An area's canvas: its decorations, and its tables with their statuses. */
export const layoutQuery = (outletId: string, areaId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.layout(outletId, areaId),
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/outlets/{oid}/areas/{aid}/layout', { params: { path: { oid: outletId, aid: areaId } } }),
      ),
  })

/**
 * Every table of an outlet, by area and then by name, a page of the most
 * there is at a time: a schedule picks from all of them.
 */
export const allTablesQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.tables.lists(outletId), 'all'] as const,
    queryFn: async () => {
      const tables: Table[] = []
      for (let page = 1; ; page++) {
        const list = await unwrap(
          api.GET('/api/v1/outlets/{oid}/tables', {
            params: { path: { oid: outletId }, query: { page, page_size: 100 } },
          }),
        )
        tables.push(...list.data)
        if (tables.length >= list.meta.total || list.data.length === 0) return tables
      }
    },
  })

export const scheduleListQuery = (outletId: string, search: ScheduleSearch) =>
  queryOptions({
    queryKey: [...queryKeys.tables.schedules(outletId), 'list', search] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/outlets/{oid}/table-schedules', { params: { path: { oid: outletId }, query: search } }),
      ),
  })

export const scheduleQuery = (outletId: string, scheduleId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.schedule(outletId, scheduleId),
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/outlets/{oid}/table-schedules/{sid}', {
          params: { path: { oid: outletId, sid: scheduleId } },
        }),
      ),
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
    mutationFn: (body: AreaInput) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/areas', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateArea(outletId: string, areaId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (body: AreaInput) =>
      unwrap(api.PUT('/api/v1/outlets/{oid}/areas/{aid}', { params: { path: { oid: outletId, aid: areaId } }, body })),
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
    mutationFn: (areaIds: string[]) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/areas/order', {
          params: { path: { oid: outletId } },
          body: { area_ids: areaIds },
        }),
      ),
    onMutate: async (areaIds) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData(queryKey)
      if (before) {
        const byId = new Map(before.data.map((area) => [area.area_id, area]))
        const data = areaIds.flatMap((id, index) => {
          const area = byId.get(id)
          return area ? [{ ...area, sort_order: index }] : []
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

export function useDeleteArea(outletId: string, areaId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE('/api/v1/outlets/{oid}/areas/{aid}', { params: { path: { oid: outletId, aid: areaId } } })),
    onSuccess: changed,
  })
}

export function useCreateTable(outletId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (body: TableInput) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/tables', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateTable(outletId: string, tableId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (body: TableInput) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/tables/{tid}', { params: { path: { oid: outletId, tid: tableId } }, body }),
      ),
    onSuccess: changed,
  })
}

export function useSetTableActive(outletId: string, tableId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (isActive: boolean) =>
      unwrap(
        api.PATCH('/api/v1/outlets/{oid}/tables/{tid}/status', {
          params: { path: { oid: outletId, tid: tableId } },
          body: { is_active: isActive },
        }),
      ),
    onSuccess: changed,
  })
}

export function useDeleteTable(outletId: string, tableId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE('/api/v1/outlets/{oid}/tables/{tid}', { params: { path: { oid: outletId, tid: tableId } } })),
    onSuccess: changed,
  })
}

/** Saves an area's whole layout, on the version the editor opened. */
export function useSaveLayout(outletId: string, areaId: string) {
  const queryClient = useQueryClient()
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (body: LayoutInput) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/areas/{aid}/layout', {
          params: { path: { oid: outletId, aid: areaId } },
          body,
        }),
      ),
    onSuccess: (layout) => {
      queryClient.setQueryData(queryKeys.tables.layout(outletId, areaId), layout)
      void changed()
    },
  })
}

export function useCreateSchedule(outletId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (body: ScheduleInput) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/table-schedules', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateSchedule(outletId: string, scheduleId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: (body: ScheduleInput) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/table-schedules/{sid}', {
          params: { path: { oid: outletId, sid: scheduleId } },
          body,
        }),
      ),
    onSuccess: changed,
  })
}

/** Cancels a schedule that isn't over: its tables are back in service. */
export function useCancelSchedule(outletId: string, scheduleId: string) {
  const changed = useTablesChanged(outletId)
  return useMutation({
    mutationFn: () =>
      unwrap(
        api.DELETE('/api/v1/outlets/{oid}/table-schedules/{sid}', {
          params: { path: { oid: outletId, sid: scheduleId } },
        }),
      ),
    onSuccess: changed,
  })
}
