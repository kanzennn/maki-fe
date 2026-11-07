import { MAX_UPLOAD_BYTES, uploadContentTypes, type UploadContentType } from '../types'

export function isUploadContentType(type: string): type is UploadContentType {
  return (uploadContentTypes as readonly string[]).includes(type)
}

/**
 * What is wrong with a file picked as a photo, or null. It only spares a
 * pointless upload: the server signs the same limits in, and the worker opens
 * the file to see what it really is.
 */
export function photoProblem(file: File): 'type' | 'size' | null {
  if (!isUploadContentType(file.type)) return 'type'
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return 'size'
  return null
}
