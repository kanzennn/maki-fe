import type { components } from '@/lib/api-schema'

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

/** The outlet's tables as the cashier picks from them: its areas, their layouts, each table's status. */
export type Floor = components['schemas']['Floor']
export type FloorArea = components['schemas']['FloorArea']
export type FloorTable = components['schemas']['FloorTable']

export const tableShapes = ['square', 'round', 'rectangle'] as const satisfies readonly TableShape[]
export const scheduleStatuses = ['upcoming', 'ongoing', 'finished', 'cancelled'] as const satisfies readonly ScheduleStatus[]
export const dineInModes = ['table', 'number'] as const satisfies readonly DineInMode[]

/**
 * An area's grid, in cells, and a cell's size in a floor drawing's own
 * units: the server's canvas, which the admin's editor and the cashier's
 * floor both draw.
 */
export const FLOOR = { width: 48, height: 32, cell: 20 } as const

/** The tables page as its address bar holds it: the area shown. */
export type TablesState = { area?: string }

/** A schedule list as its page shows it: status, page. */
export type ScheduleListState = { status?: ScheduleStatus; page?: number }

export const MAX_CAPACITY = 99

export type AreaFormValues = { name: string }

/** A table's form, as typed: its seats as digits, or empty for seats not given. */
export type TableFormValues = {
  name: string
  area_id: string
  capacity: string
  shape: TableShape
  is_active: boolean
}

/** The form's fields, which the server's validation_failed answers name too. */
export const tableFields = ['name', 'area_id', 'capacity', 'shape', 'is_active'] as const satisfies readonly (keyof TableFormValues)[]

/** A schedule's form, as typed: its times as a datetime-local field holds them, in the outlet's zone. */
export type ScheduleFormValues = {
  title: string
  start_at: string
  end_at: string
  table_ids: string[]
}

export const scheduleFields = ['title', 'start_at', 'end_at', 'table_ids'] as const satisfies readonly (keyof ScheduleFormValues)[]

/**
 * A schedule's form as it's sent: its values, the outlet's zone they're
 * in, and whether the user saves it though it overlaps another.
 */
export type ScheduleSubmission = { values: ScheduleFormValues; timeZone: string; confirmOverlap: boolean }

/**
 * The layout editor's canvas: an area's grid of GRID cells, a table a box
 * of TABLE_SIDE cells a side on it, a decoration one cell up to the whole
 * grid.
 */
export const GRID = { width: FLOOR.width, height: FLOOR.height } as const
export const TABLE_SIDE = { min: 2, max: 16 } as const

export type Box = { x: number; y: number; w: number; h: number }
export type Rotation = 0 | 90 | 180 | 270

/** A new box's size: a round or square table 3×3, a rectangle 5×3; a wall 8×1, the cashier 4×2, a door 3×1. */
export const NEW_BOX_SIZE = {
  square: { w: 3, h: 3 },
  round: { w: 3, h: 3 },
  rectangle: { w: 5, h: 3 },
  wall: { w: 8, h: 1 },
  cashier: { w: 4, h: 2 },
  door: { w: 3, h: 1 },
} as const satisfies Record<TableShape | DecorationKind, { w: number; h: number }>

/** A table as the editor holds it: placed on the canvas (box) or not. */
export type EditorTable = { tableId: string; name: string; shape: TableShape; box: Box | null; rotation: Rotation }

/** A decoration as the editor holds it, under an ID of the draft's own. */
export type EditorDecoration = { id: string; kind: DecorationKind; box: Box; rotation: Rotation }

/** A layout being edited, and the version it was opened on. */
export type Draft = { version: number; tables: EditorTable[]; decorations: EditorDecoration[] }

/** What the editor has selected: a table, or a decoration. */
export type Selection = { type: 'table'; id: string } | { type: 'decoration'; id: string }
