import * as scheduleRepository from '../repositories/schedule.repository'
import type { Schedule } from '../types'

export function getSchedule(outletId: string, scheduleId: string): Promise<Schedule> {
  return scheduleRepository.getSchedule(outletId, scheduleId)
}
