import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { CreateStaffRequest, Staff, StaffStatus, UpdateStaffRequest } from '../types'

export function listStaff(outletId: string, params: QueryParams<'/outlets/{oid}/users'>): Promise<Page<Staff>> {
  return http.getPaginated<Staff>(apiPath('/outlets/{oid}/users', { oid: outletId }), params)
}

export function getStaff(outletId: string, userId: string): Promise<Staff> {
  return http.get<Staff>(apiPath('/outlets/{oid}/users/{uid}', { oid: outletId, uid: userId }))
}

export function createStaff(outletId: string, body: CreateStaffRequest): Promise<Staff> {
  return http.post<Staff>(apiPath('/outlets/{oid}/users', { oid: outletId }), body)
}

export function updateStaff(outletId: string, userId: string, body: UpdateStaffRequest): Promise<Staff> {
  return http.put<Staff>(apiPath('/outlets/{oid}/users/{uid}', { oid: outletId, uid: userId }), body)
}

export function setStaffStatus(outletId: string, userId: string, status: StaffStatus): Promise<Staff> {
  return http.patch<Staff>(apiPath('/outlets/{oid}/users/{uid}/status', { oid: outletId, uid: userId }), { status })
}

/** Gives the account a temporary password, which it must change at its next sign-in. */
export function resetStaffPassword(outletId: string, userId: string, password: string): Promise<void> {
  return http.post(apiPath('/outlets/{oid}/users/{uid}/reset-password', { oid: outletId, uid: userId }), { password })
}

export function deleteStaff(outletId: string, userId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/users/{uid}', { oid: outletId, uid: userId }))
}
