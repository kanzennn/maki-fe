import type { PosDevice } from '../types'

/**
 * After a sale: the count the device's next receipt number takes, from the
 * number just used, while GET /pos/device is asked again.
 */
export function afterSale(device: PosDevice, orderNo: string): PosDevice {
  const [day, count] = orderNo.split('-').slice(-2)
  const iso = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)}`
  if (iso !== device.day) return device
  return { ...device, next_number: Math.max(device.next_number, Number(count) + 1) }
}
