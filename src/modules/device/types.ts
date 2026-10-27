import type { components } from '@/lib/api-schema'

/** One of an outlet's cashier devices: a phone or browser activated to sell. */
export type Device = components['schemas']['Device']

export type ActivateDeviceRequest = components['schemas']['ActivateDeviceRequest']
export type ActivatedDevice = components['schemas']['ActivatedDevice']

/** The most characters a device's name has: the server's limit. */
export const MAX_DEVICE_NAME = 50

/** The device list as the page shows it: which page. */
export type DeviceListState = { page?: number }
