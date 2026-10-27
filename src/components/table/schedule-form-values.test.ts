import { describe, expect, it } from 'vitest'

import { testSchedule } from '@/test/tables'

import { scheduleFormValues } from './schedule-form-values'

describe('scheduleFormValues', () => {
  it("starts from the schedule's times in the outlet's zone, without the tables deleted since", () => {
    const schedule = testSchedule('s1', 'Acara kantor', {
      tables: [
        ...testSchedule('s1', '').tables,
        { table_id: 't-old', name: 'Lama', area: { area_id: 'a-in', name: 'Indoor' }, deleted: true },
      ],
    })
    expect(scheduleFormValues('Asia/Jakarta', schedule)).toEqual({
      title: 'Acara kantor',
      start_at: '2026-10-10T10:00',
      end_at: '2026-10-10T15:00',
      table_ids: ['t-a1', 't-a2'],
    })
    expect(scheduleFormValues('Asia/Jayapura', schedule).start_at).toBe('2026-10-10T12:00')
  })

  it('gives a new schedule empty fields', () => {
    expect(scheduleFormValues('Asia/Jakarta')).toEqual({ title: '', start_at: '', end_at: '', table_ids: [] })
  })
})
