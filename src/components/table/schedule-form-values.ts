import { toZonedInput } from '@/lib/time'
import type { Schedule, ScheduleFormValues } from '@/modules/table/types'

/** The schedule form's starting values, in the outlet's zone: a schedule's, or a new one's. */
export function scheduleFormValues(timeZone: string, schedule?: Schedule): ScheduleFormValues {
  return {
    title: schedule?.title ?? '',
    start_at: schedule ? toZonedInput(schedule.start_at, timeZone) : '',
    end_at: schedule ? toZonedInput(schedule.end_at, timeZone) : '',
    // A deleted table can't stay on it.
    table_ids: schedule?.tables.filter((t) => !t.deleted).map((t) => t.table_id) ?? [],
  }
}
