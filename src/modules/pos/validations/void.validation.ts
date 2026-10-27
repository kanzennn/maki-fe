import { ValidationError } from '@/lib/validation'

import { MAX_VOID_REASON } from '../types'

/**
 * The reason a void is made for, trimmed: the spec requires one, of at most
 * MAX_VOID_REASON characters. A ValidationError on `reason` otherwise.
 */
export function validateVoidReason(reason: string): string {
  const trimmed = reason.trim()
  if (trimmed === '') throw new ValidationError({ reason: 'required' })
  if (trimmed.length > MAX_VOID_REASON) throw new ValidationError({ reason: 'max' })
  return trimmed
}
