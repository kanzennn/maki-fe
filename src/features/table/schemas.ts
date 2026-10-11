import { z } from 'zod'

import { fromZonedInput, toZonedInput } from '@/shared/lib/time'

import { tableShapes, type Schedule, type ScheduleInput, type Table, type TableInput } from './api'

// Messages are rules, shown from common:validation (useFieldError). They are
// the server's rules; it checks everything again, including what only it can
// tell (a name taken, a start already past, a schedule that overlaps
// another), and has the last word.

export const MAX_CAPACITY = 99

export const areaSchema = z.object({
  name: z.string().trim().min(1, 'required').max(50, 'max'),
})

export type AreaValues = z.infer<typeof areaSchema>

export const tableSchema = z
  .object({
    name: z.string().trim().min(1, 'required').max(30, 'max'),
    area_id: z.string().min(1, 'required'),
    /** Digits, or empty for seats not given. */
    capacity: z.string(),
    shape: z.enum(tableShapes),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.capacity !== '' && !(Number(v.capacity) >= 1 && Number(v.capacity) <= MAX_CAPACITY)) {
      ctx.addIssue({ code: 'custom', path: ['capacity'], message: 'range' })
    }
  })

export type TableValues = z.infer<typeof tableSchema>

/** The form's fields, which the server's validation_failed answers name too. */
export const tableFields = ['name', 'area_id', 'capacity', 'shape', 'is_active'] as const satisfies readonly (keyof TableValues)[]

/** The form's starting values: a table's, or a new one's in the area. */
export function tableValues(table?: Table, areaId = ''): TableValues {
  return {
    name: table?.name ?? '',
    area_id: table?.area.area_id ?? areaId,
    capacity: table?.capacity != null ? String(table.capacity) : '',
    shape: table?.shape ?? 'square',
    is_active: table?.is_active ?? true,
  }
}

export function toTableInput(values: TableValues): TableInput {
  return {
    name: values.name.trim(),
    area_id: values.area_id,
    capacity: values.capacity === '' ? null : Number(values.capacity),
    shape: values.shape,
    is_active: values.is_active,
  }
}

/** A datetime-local field's value: a day and a time, to the minute. */
const localTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export const scheduleSchema = z
  .object({
    title: z.string().trim().min(1, 'required').max(100, 'max'),
    /** In the outlet's time zone. */
    start_at: z.string(),
    end_at: z.string(),
    table_ids: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    for (const field of ['start_at', 'end_at'] as const) {
      if (v[field] === '') fail(field, 'required')
      else if (!localTime.test(v[field])) fail(field, 'format')
    }
    // Both in the outlet's zone, so their text compares as their times do.
    if (localTime.test(v.start_at) && localTime.test(v.end_at) && v.end_at <= v.start_at) fail('end_at', 'after')
    if (v.table_ids.length === 0) fail('table_ids', 'required')
  })

export type ScheduleValues = z.infer<typeof scheduleSchema>

export const scheduleFields = ['title', 'start_at', 'end_at', 'table_ids'] as const satisfies readonly (keyof ScheduleValues)[]

/** The form's starting values, in the outlet's zone: a schedule's, or a new one's. */
export function scheduleValues(timeZone: string, schedule?: Schedule): ScheduleValues {
  return {
    title: schedule?.title ?? '',
    start_at: schedule ? toZonedInput(schedule.start_at, timeZone) : '',
    end_at: schedule ? toZonedInput(schedule.end_at, timeZone) : '',
    // A deleted table can't stay on it.
    table_ids: schedule?.tables.filter((t) => !t.deleted).map((t) => t.table_id) ?? [],
  }
}

export function toScheduleInput(values: ScheduleValues, timeZone: string, confirmOverlap = false): ScheduleInput {
  return {
    title: values.title.trim(),
    start_at: fromZonedInput(values.start_at, timeZone),
    end_at: fromZonedInput(values.end_at, timeZone),
    table_ids: values.table_ids,
    confirm_overlap: confirmOverlap,
  }
}
