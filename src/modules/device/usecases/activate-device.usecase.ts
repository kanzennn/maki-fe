import * as deviceRepository from '../repositories/device.repository'
import type { ActivatedDevice } from '../types'
import { validateDeviceName } from '../validations/device.validation'

/**
 * Makes this browser one of the outlet's cashiers, under a name. A browser's
 * token comes back as a cookie that page scripts can't read, not in the body.
 */
export function activateDevice(outletId: string, name: string): Promise<ActivatedDevice> {
  return deviceRepository.activateDevice(outletId, { name: validateDeviceName(name), platform: 'web' })
}
