import { notFound } from '@tanstack/react-router'

import { ApiError } from '@/shared/api/client'

/**
 * For route loaders: what load resolves to, with a 404 from the API — an
 * outlet, role or user that doesn't exist or was deleted — shown as the
 * route's not-found page instead of an error.
 */
export async function orNotFound<T>(load: Promise<T>): Promise<T> {
  try {
    return await load
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw notFound()
    throw error
  }
}
