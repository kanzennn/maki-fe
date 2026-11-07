import type { components } from '@/lib/api-schema'

export type UploadPurpose = components['schemas']['PresignUploadRequest']['purpose']
export type UploadContentType = components['schemas']['PresignUploadRequest']['content_type']
export type UploadTicket = components['schemas']['UploadTicket']

export const uploadContentTypes = ['image/jpeg', 'image/png', 'image/webp'] as const satisfies readonly UploadContentType[]

/** 2 MB, the most a photo may be. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

/** What a form will do with a photo when it is saved: a new file, taking it away, or nothing. */
export type PhotoChoice = { file: File | null; removed: boolean }

export const noPhotoChange: PhotoChoice = { file: null, removed: false }
