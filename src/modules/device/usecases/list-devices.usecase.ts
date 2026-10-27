import type { Page } from '@/lib/http'

import { deviceListParams } from '../filters'
import * as deviceRepository from '../repositories/device.repository'
import type { Device, DeviceListState } from '../types'

/** The page of the outlet's cashier devices the list shows. */
export function listDevices(outletId: string, state: DeviceListState): Promise<Page<Device>> {
  return deviceRepository.listDevices(outletId, deviceListParams(state))
}
