import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { ActivatedDevice, ActivateDeviceRequest, Device } from '../types'

/** A page of the outlet's cashier devices: those in use first, then the revoked. */
export function listDevices(outletId: string, params: QueryParams<'/outlets/{oid}/devices'>): Promise<Page<Device>> {
  return http.getPaginated<Device>(apiPath('/outlets/{oid}/devices', { oid: outletId }), params)
}

/** Makes the device sending it one of the outlet's cashiers. */
export function activateDevice(outletId: string, body: ActivateDeviceRequest): Promise<ActivatedDevice> {
  return http.post<ActivatedDevice>(apiPath('/outlets/{oid}/devices', { oid: outletId }), body)
}

export function revokeDevice(outletId: string, deviceId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/devices/{did}', { oid: outletId, did: deviceId }))
}
