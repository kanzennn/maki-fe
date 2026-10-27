import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Schedule, ScheduleInput } from '../types'

export function listSchedules(
  outletId: string,
  params: QueryParams<'/outlets/{oid}/table-schedules'>,
): Promise<Page<Schedule>> {
  return http.getPaginated<Schedule>(apiPath('/outlets/{oid}/table-schedules', { oid: outletId }), params)
}

export function getSchedule(outletId: string, scheduleId: string): Promise<Schedule> {
  return http.get<Schedule>(apiPath('/outlets/{oid}/table-schedules/{sid}', { oid: outletId, sid: scheduleId }))
}

export function createSchedule(outletId: string, body: ScheduleInput): Promise<Schedule> {
  return http.post<Schedule>(apiPath('/outlets/{oid}/table-schedules', { oid: outletId }), body)
}

export function updateSchedule(outletId: string, scheduleId: string, body: ScheduleInput): Promise<Schedule> {
  return http.put<Schedule>(apiPath('/outlets/{oid}/table-schedules/{sid}', { oid: outletId, sid: scheduleId }), body)
}

/** Cancels a schedule that isn't over. */
export function cancelSchedule(outletId: string, scheduleId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/table-schedules/{sid}', { oid: outletId, sid: scheduleId }))
}
