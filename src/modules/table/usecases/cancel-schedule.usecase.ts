import * as scheduleRepository from '../repositories/schedule.repository'

/** Cancels a schedule that isn't over: its tables are back in service. */
export function cancelSchedule(outletId: string, scheduleId: string): Promise<void> {
  return scheduleRepository.cancelSchedule(outletId, scheduleId)
}
