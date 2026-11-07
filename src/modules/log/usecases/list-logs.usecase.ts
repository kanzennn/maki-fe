import type { Page } from '@/lib/http'

import { outletLogParams, ownerLogParams } from '../filters'
import * as logRepository from '../repositories/log.repository'
import type { ActionLog, LogListState } from '../types'

/** The page of every outlet's log the Owner's list shows, its dates in timeZone. */
export function listOwnerLogs(state: LogListState, timeZone: string): Promise<Page<ActionLog>> {
  return logRepository.listOwnerLogs(ownerLogParams(state, timeZone))
}

/** The page of the outlet's log its list shows, its dates in the outlet's time zone. */
export function listOutletLogs(outletId: string, state: LogListState, timeZone: string): Promise<Page<ActionLog>> {
  return logRepository.listOutletLogs(outletId, outletLogParams(state, timeZone))
}
