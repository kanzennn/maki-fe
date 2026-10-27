import { apiPath, http } from '@/lib/http'

import type { DineInMode } from '../types'

/** How the outlet seats its dine-in customers: at its tables, or by number stands. */
export async function getDineInMode(outletId: string): Promise<DineInMode> {
  return (await http.get<{ mode: DineInMode }>(apiPath('/outlets/{oid}/dine-in-mode', { oid: outletId }))).mode
}

export async function setDineInMode(outletId: string, mode: DineInMode): Promise<DineInMode> {
  return (await http.put<{ mode: DineInMode }>(apiPath('/outlets/{oid}/dine-in-mode', { oid: outletId }), { mode })).mode
}
