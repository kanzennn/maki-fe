import * as deviceRepository from '../repositories/device.repository'

/** Revokes a cashier device: it can't sell from then on. */
export function revokeDevice(outletId: string, deviceId: string): Promise<void> {
  return deviceRepository.revokeDevice(outletId, deviceId)
}
