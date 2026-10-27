import * as scheduleRepository from '../repositories/schedule.repository'
import type { Schedule, ScheduleSubmission } from '../types'
import { validateScheduleForm } from '../validations/table.validation'

/**
 * Takes the tables out of service for a while. A 409 schedule_overlaps names
 * the other schedules at the same tables then; sent again confirmed, it saves.
 */
export function createSchedule(outletId: string, { values, timeZone, confirmOverlap }: ScheduleSubmission): Promise<Schedule> {
  return scheduleRepository.createSchedule(outletId, validateScheduleForm(values, timeZone, confirmOverlap))
}
