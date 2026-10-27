import * as posDeviceRepository from '../repositories/pos-device.repository'
import type { PosDevice } from '../types'

/**
 * This browser as one of the outlet's cashier devices, with its count of
 * receipt numbers today. 403 device_not_registered or device_revoked: it
 * can't sell, and no retry changes that.
 */
export function getPosDevice(outletId: string): Promise<PosDevice> {
  return posDeviceRepository.getPosDevice(outletId)
}
