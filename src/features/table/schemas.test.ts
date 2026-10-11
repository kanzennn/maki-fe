import { describe, expect, it } from 'vitest'

import { testA1, testSchedule } from '@/test/tables'

import {
  areaSchema,
  scheduleSchema,
  scheduleValues,
  tableSchema,
  tableValues,
  toScheduleInput,
  toTableInput,
  type ScheduleValues,
  type TableValues,
} from './schemas'

/** Each field's rule, as the form shows it. */
function rules(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]))
}

describe('a table', () => {
  const valid: TableValues = { name: 'A1', area_id: 'a-in', capacity: '4', shape: 'square', is_active: true }

  it('needs a name of 30 characters at most, and an area', () => {
    expect(rules(tableSchema.safeParse({ ...valid, name: '  ', area_id: '' }))).toEqual({ name: 'required', area_id: 'required' })
    expect(rules(tableSchema.safeParse({ ...valid, name: 'x'.repeat(31) }))).toEqual({ name: 'max' })
    expect(tableSchema.safeParse({ ...valid, name: ` ${'x'.repeat(30)} ` }).success).toBe(true)
  })

  it('takes 1 to 99 seats, or none', () => {
    for (const capacity of ['', '1', '99']) expect(tableSchema.safeParse({ ...valid, capacity }).success).toBe(true)
    for (const capacity of ['0', '100']) expect(rules(tableSchema.safeParse({ ...valid, capacity }))).toEqual({ capacity: 'range' })
  })

  it('starts from the table, or a new one in the area', () => {
    expect(tableValues(testA1)).toEqual({ name: 'A1', area_id: 'a-in', capacity: '4', shape: 'square', is_active: true })
    expect(tableValues(undefined, 'a-out')).toEqual({ name: '', area_id: 'a-out', capacity: '', shape: 'square', is_active: true })
  })

  it('is sent trimmed, its seats a number or null', () => {
    expect(toTableInput({ ...valid, name: ' A1 ', capacity: '' })).toEqual({
      name: 'A1',
      area_id: 'a-in',
      capacity: null,
      shape: 'square',
      is_active: true,
    })
    expect(toTableInput(valid).capacity).toBe(4)
  })
})

describe('an area', () => {
  it('needs a name of 50 characters at most', () => {
    expect(rules(areaSchema.safeParse({ name: ' ' }))).toEqual({ name: 'required' })
    expect(rules(areaSchema.safeParse({ name: 'x'.repeat(51) }))).toEqual({ name: 'max' })
    expect(areaSchema.safeParse({ name: 'x'.repeat(50) }).success).toBe(true)
  })
})

describe('a schedule', () => {
  const valid: ScheduleValues = {
    title: 'Acara kantor',
    start_at: '2026-10-10T10:00',
    end_at: '2026-10-10T15:00',
    table_ids: ['t-a1'],
  }

  it('needs a title, both times, and a table', () => {
    expect(rules(scheduleSchema.safeParse({ title: ' ', start_at: '', end_at: '', table_ids: [] }))).toEqual({
      title: 'required',
      start_at: 'required',
      end_at: 'required',
      table_ids: 'required',
    })
    expect(rules(scheduleSchema.safeParse({ ...valid, title: 'x'.repeat(101) }))).toEqual({ title: 'max' })
  })

  it('takes times to the minute, and an end after the start', () => {
    expect(rules(scheduleSchema.safeParse({ ...valid, start_at: '2026-10-10', end_at: '10:00' }))).toEqual({
      start_at: 'format',
      end_at: 'format',
    })
    expect(rules(scheduleSchema.safeParse({ ...valid, end_at: valid.start_at }))).toEqual({ end_at: 'after' })
    expect(rules(scheduleSchema.safeParse({ ...valid, end_at: '2026-10-10T09:59' }))).toEqual({ end_at: 'after' })
    // The next day, though earlier in it.
    expect(scheduleSchema.safeParse({ ...valid, end_at: '2026-10-11T09:00' }).success).toBe(true)
  })

  it("starts from the schedule's times in the outlet's zone, without the tables deleted since", () => {
    const schedule = testSchedule('s1', 'Acara kantor', {
      tables: [
        ...testSchedule('s1', '').tables,
        { table_id: 't-old', name: 'Lama', area: { area_id: 'a-in', name: 'Indoor' }, deleted: true },
      ],
    })
    expect(scheduleValues('Asia/Jakarta', schedule)).toEqual({
      title: 'Acara kantor',
      start_at: '2026-10-10T10:00',
      end_at: '2026-10-10T15:00',
      table_ids: ['t-a1', 't-a2'],
    })
    expect(scheduleValues('Asia/Jayapura', schedule).start_at).toBe('2026-10-10T12:00')
    expect(scheduleValues('Asia/Jakarta')).toEqual({ title: '', start_at: '', end_at: '', table_ids: [] })
  })

  it("is sent in UTC, read in the outlet's zone, trimmed, and confirmed only when asked", () => {
    expect(toScheduleInput({ ...valid, title: ' Acara kantor ' }, 'Asia/Jakarta')).toEqual({
      title: 'Acara kantor',
      start_at: '2026-10-10T03:00:00.000Z',
      end_at: '2026-10-10T08:00:00.000Z',
      table_ids: ['t-a1'],
      confirm_overlap: false,
    })
    expect(toScheduleInput(valid, 'Asia/Makassar', true)).toMatchObject({
      start_at: '2026-10-10T02:00:00.000Z',
      confirm_overlap: true,
    })
  })
})
