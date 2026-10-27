import type { Page } from '@/lib/http'

import { scheduleListParams } from '../filters'
import * as scheduleRepository from '../repositories/schedule.repository'
import type { Schedule, ScheduleListState } from '../types'

/** The page of the outlet's schedules the list shows. */
export function listSchedules(outletId: string, state: ScheduleListState): Promise<Page<Schedule>> {
  return scheduleRepository.listSchedules(outletId, scheduleListParams(state))
}
