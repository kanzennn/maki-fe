import { apiPath, http } from '@/lib/http'

import type { PosDevice } from '../types'

/** This browser as one of the outlet's cashier devices, with its count of receipt numbers today. */
export function getPosDevice(outletId: string): Promise<PosDevice> {
  return http.get<PosDevice>(apiPath('/outlets/{oid}/pos/device', { oid: outletId }))
}
