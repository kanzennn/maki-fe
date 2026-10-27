import * as scheduleRepository from '../repositories/schedule.repository'
import type { Schedule, ScheduleSubmission } from '../types'
import { validateScheduleForm } from '../validations/table.validation'

export function updateSchedule(
  outletId: string,
  scheduleId: string,
  { values, timeZone, confirmOverlap }: ScheduleSubmission,
): Promise<Schedule> {
  return scheduleRepository.updateSchedule(outletId, scheduleId, validateScheduleForm(values, timeZone, confirmOverlap))
}
