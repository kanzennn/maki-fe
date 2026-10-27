import { describe, expect, it } from 'vitest'

import { ValidationError } from '@/lib/validation'

import type { ScheduleFormValues, TableFormValues } from '../types'
import { validateAreaForm, validateScheduleForm, validateTableForm } from './table.validation'

/** The rules the values break, by field: the first of each, as the form shows it. */
function broken(validate: () => unknown): Record<string, string> {
  try {
    validate()
    return {}
  } catch (error) {
    if (error instanceof ValidationError) return { ...error.fields }
    throw error
  }
}

describe('a table', () => {
  const valid: TableFormValues = { name: 'A1', area_id: 'a-in', capacity: '4', shape: 'square', is_active: true }
  const table = (edit: Partial<TableFormValues>) => broken(() => validateTableForm({ ...valid, ...edit }))

  it('needs a name of 30 characters at most, and an area', () => {
    expect(table({ name: '  ', area_id: '' })).toEqual({ name: 'required', area_id: 'required' })
    expect(table({ name: 'x'.repeat(31) })).toEqual({ name: 'max' })
    expect(table({ name: ` ${'x'.repeat(30)} ` })).toEqual({})
  })

  it('takes 1 to 99 seats, or none', () => {
    for (const capacity of ['', '1', '99']) expect(table({ capacity })).toEqual({})
    for (const capacity of ['0', '100']) expect(table({ capacity })).toEqual({ capacity: 'range' })
  })

  it('is sent trimmed, its seats a number or null', () => {
    expect(validateTableForm({ ...valid, name: ' A1 ', capacity: '' })).toEqual({
      name: 'A1',
      area_id: 'a-in',
      capacity: null,
      shape: 'square',
      is_active: true,
    })
    expect(validateTableForm(valid).capacity).toBe(4)
  })
})

describe('an area', () => {
  it('needs a name of 50 characters at most', () => {
    expect(broken(() => validateAreaForm({ name: ' ' }))).toEqual({ name: 'required' })
    expect(broken(() => validateAreaForm({ name: 'x'.repeat(51) }))).toEqual({ name: 'max' })
    expect(validateAreaForm({ name: ` ${'x'.repeat(50)} ` })).toEqual({ name: 'x'.repeat(50) })
  })
})

describe('a schedule', () => {
  const valid: ScheduleFormValues = {
    title: 'Acara kantor',
    start_at: '2026-10-10T10:00',
    end_at: '2026-10-10T15:00',
    table_ids: ['t-a1'],
  }
  const schedule = (edit: Partial<ScheduleFormValues>) =>
    broken(() => validateScheduleForm({ ...valid, ...edit }, 'Asia/Jakarta'))

  it('needs a title, both times, and a table', () => {
    expect(schedule({ title: ' ', start_at: '', end_at: '', table_ids: [] })).toEqual({
      title: 'required',
      start_at: 'required',
      end_at: 'required',
      table_ids: 'required',
    })
    expect(schedule({ title: 'x'.repeat(101) })).toEqual({ title: 'max' })
  })

  it('takes times to the minute that the calendar has, and an end after the start', () => {
    expect(schedule({ start_at: '2026-10-10', end_at: '10:00' })).toEqual({ start_at: 'format', end_at: 'format' })
    expect(schedule({ start_at: '2026-13-10T10:00', end_at: '2026-10-10T24:30' })).toEqual({
      start_at: 'format',
      end_at: 'format',
    })
    expect(schedule({ end_at: valid.start_at })).toEqual({ end_at: 'after' })
    expect(schedule({ end_at: '2026-10-10T09:59' })).toEqual({ end_at: 'after' })
    // The next day, though earlier in it.
    expect(schedule({ end_at: '2026-10-11T09:00' })).toEqual({})
  })

  it("is sent in UTC, read in the outlet's zone, trimmed, and confirmed only when asked", () => {
    expect(validateScheduleForm({ ...valid, title: ' Acara kantor ' }, 'Asia/Jakarta')).toEqual({
      title: 'Acara kantor',
      start_at: '2026-10-10T03:00:00.000Z',
      end_at: '2026-10-10T08:00:00.000Z',
      table_ids: ['t-a1'],
      confirm_overlap: false,
    })
    expect(validateScheduleForm(valid, 'Asia/Makassar', true)).toMatchObject({
      start_at: '2026-10-10T02:00:00.000Z',
      confirm_overlap: true,
    })
  })
})
