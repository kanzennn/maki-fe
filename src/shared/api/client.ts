import i18n from 'i18next'
import createClient from 'openapi-fetch'

import { useSession, type SessionResponse } from '@/shared/lib/session'

import type { components, paths } from './schema'

type ErrorEnvelope = components['schemas']['ErrorEnvelope']

/** An error response from the API, carrying the envelope's stable `code`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly details?: Record<string, unknown>

  constructor(status: number, envelope?: ErrorEnvelope) {
    super(envelope?.error.message ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    // A response without the envelope (a proxy's 502, say) is shown as a
    // generic server error.
    this.code = envelope?.error.code ?? 'internal_error'
    this.requestId = envelope?.error.request_id
    this.details = envelope?.error.details
  }
}

// Same origin unless VITE_API_ORIGIN says otherwise. Absolute either way:
// fetch outside a browser (tests) can't resolve a relative URL.
const apiOrigin: string = import.meta.env.VITE_API_ORIGIN || window.location.origin
const refreshPath = '/api/v1/auth/refresh'

/** Endpoints that sign in or out: a 401 from them is the answer, not an expired token. */
function isAuthEndpoint(url: string) {
  return new URL(url, window.location.href).pathname.startsWith('/api/v1/auth/')
}

function withHeaders(request: Request): Request {
  const headers = new Headers(request.headers)
  const token = useSession.getState().accessToken
  if (token) headers.set('Authorization', `Bearer ${token}`)
  else headers.delete('Authorization')
  headers.set('Accept-Language', i18n.language)
  return new Request(request, { headers })
}

/**
 * fetch for the API client: it attaches the access token and the UI
 * language, and on a 401 refreshes the session once and retries. If the
 * refresh fails too, the session is cleared, which sends the user to the
 * sign-in page.
 */
async function authFetch(request: Request): Promise<Response> {
  // Kept before sending: a request's body can be read only once.
  const retry = request.clone()
  const response = await globalThis.fetch(withHeaders(request))
  if (response.status !== 401 || isAuthEndpoint(request.url)) return response
  if (!(await refreshSession())) return response
  return globalThis.fetch(withHeaders(retry))
}

let inFlight: Promise<boolean> | null = null

/**
 * Exchanges the refresh cookie for a new access token. Calls that overlap
 * share one refresh, and tabs take turns through the Web Locks API, so a
 * session is never refreshed twice at once. Resolves to whether the user is
 * signed in afterwards; a failure clears the session.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= lockedRefresh().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function lockedRefresh(): Promise<boolean> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  return locks ? locks.request('maki-session-refresh', refreshOnce) : refreshOnce()
}

async function refreshOnce(): Promise<boolean> {
  // A 409 means another tab refreshed a moment ago with the same cookie;
  // the browser holds the new one now, so one more try succeeds.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await globalThis.fetch(
      withHeaders(new Request(apiOrigin + refreshPath, { method: 'POST', credentials: 'include' })),
    )
    if (response.ok) {
      useSession.getState().setSession((await response.json()) as SessionResponse)
      return true
    }
    if (response.status !== 409) break
  }
  useSession.getState().clear()
  return false
}

type ClientOptions = {
  baseUrl?: string
  fetch?: (request: Request) => Promise<Response>
}

/** Builds an API client whose paths and types come from api/openapi.yaml. */
export function createApiClient({ baseUrl = apiOrigin, fetch = authFetch }: ClientOptions = {}) {
  // credentials: the refresh cookie must go with the sign-in endpoints, also
  // when VITE_API_ORIGIN puts the API on another origin.
  return createClient<paths>({ baseUrl, fetch, credentials: 'include' })
}

export const api = createApiClient()

/** Returns a call's data, or throws an ApiError for an error response. */
export async function unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await call
  if (!response.ok) {
    throw new ApiError(response.status, isErrorEnvelope(error) ? error : undefined)
  }
  return data as T
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const { error } = value as { error: unknown }
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
}
