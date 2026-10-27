import { z } from 'zod'

import { fromZonedInput, isZonedInput } from '@/lib/time'
import { parseOrThrow } from '@/lib/validation'

import {
  MAX_CAPACITY,
  tableShapes,
  type AreaFormValues,
  type AreaInput,
  type ScheduleFormValues,
  type ScheduleInput,
  type TableFormValues,
  type TableInput,
} from '../types'

// Rules are shown from common:validation. They are the server's rules; it
// checks everything again, including what only it can tell (a name taken, a
// start already past, a schedule that overlaps another), and has the last
// word.

const areaSchema = z.object({
  name: z.string().trim().min(1, 'required').max(50, 'max'),
})

/** The area for the API from its form: its name, trimmed. */
export function validateAreaForm(values: AreaFormValues): AreaInput {
  return parseOrThrow(areaSchema, values)
}

const tableSchema = z
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

/** The table for the API from its form: its name trimmed, its seats a number or null. */
export function validateTableForm(values: TableFormValues): TableInput {
  const v = parseOrThrow(tableSchema, values)
  return {
    name: v.name,
    area_id: v.area_id,
    capacity: v.capacity === '' ? null : Number(v.capacity),
    shape: v.shape,
    is_active: v.is_active,
  }
}

const scheduleSchema = z
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
      else if (!isZonedInput(v[field])) fail(field, 'format')
    }
    // Both in the outlet's zone, so their text compares as their times do.
    if (isZonedInput(v.start_at) && isZonedInput(v.end_at) && v.end_at <= v.start_at) fail('end_at', 'after')
    if (v.table_ids.length === 0) fail('table_ids', 'required')
  })

/**
 * The schedule for the API from its form: its title trimmed, its times read
 * in the outlet's zone and sent in UTC, and the overlap with another
 * schedule confirmed only when the user did.
 */
export function validateScheduleForm(values: ScheduleFormValues, timeZone: string, confirmOverlap = false): ScheduleInput {
  const v = parseOrThrow(scheduleSchema, values)
  return {
    title: v.title,
    start_at: fromZonedInput(v.start_at, timeZone),
    end_at: fromZonedInput(v.end_at, timeZone),
    table_ids: v.table_ids,
    confirm_overlap: confirmOverlap,
  }
}
