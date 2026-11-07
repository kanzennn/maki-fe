import { apiPath, http, putToStorage } from '@/lib/http'

import type { UploadContentType, UploadPurpose, UploadTicket } from '../types'

// Uploads go straight to the object storage: the API only says where.

export function presignUpload(purpose: UploadPurpose, contentType: UploadContentType, size: number): Promise<UploadTicket> {
  return http.post<UploadTicket>(apiPath('/uploads/presign'), { purpose, content_type: contentType, size })
}

export function sendFile(ticket: UploadTicket, file: File): Promise<void> {
  return putToStorage(ticket.upload_url, file)
}

export function setMyPhoto(uploadKey: string): Promise<void> {
  return http.put(apiPath('/me/photo'), { upload_key: uploadKey })
}

export function removeMyPhoto(): Promise<void> {
  return http.delete(apiPath('/me/photo'))
}
