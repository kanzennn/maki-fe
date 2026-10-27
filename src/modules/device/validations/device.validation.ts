import { ValidationError } from '@/lib/validation'

import { MAX_DEVICE_NAME } from '../types'

/** A device's name, trimmed: one is needed, of at most MAX_DEVICE_NAME characters. A ValidationError on `name` otherwise. */
export function validateDeviceName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') throw new ValidationError({ name: 'required' })
  if (trimmed.length > MAX_DEVICE_NAME) throw new ValidationError({ name: 'max' })
  return trimmed
}
