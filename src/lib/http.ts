import axios from 'axios'
import i18next from 'i18next'

import type { Session } from '@/modules/auth/types'

import type { components, paths } from './api-schema'
import { sessionStore } from './session'

// Every HTTP request of the app goes through this file's one axios
// instance: the repositories call http.get/post/put/patch/delete and
// getPaginated, and nothing else calls axios or fetch (ESLint holds to it).

type ErrorEnvelope = components['schemas']['ErrorEnvelope']
type ListMeta = components['schemas']['ListMeta']

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set on a request sent again after a refresh, so that its own 401 isn't refreshed once more. */
    retried?: boolean
    /** The access token the request went with, if any: only such a request's 401 ends the session. */
    sentToken?: string
  }
}

/**
 * A failed call: the API's error envelope, with its stable `code`. A
 * request that got no answer at all has status 0 and code `network_error`;
 * an answer without the envelope (a proxy's 502, say) is `internal_error`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly details?: Record<string, unknown>

  constructor(status: number, envelope?: ErrorEnvelope, code?: string) {
    super(envelope?.error.message ?? (status === 0 ? 'no answer from the API' : `HTTP ${status}`))
    this.name = 'ApiError'
    this.status = status
    this.code = envelope?.error.code ?? code ?? 'internal_error'
    this.requestId = envelope?.error.request_id
    this.details = envelope?.error.details
  }
}

/**
 * Dispatched on window when a request that carried the access token was
 * refused (401) and the refresh couldn't mend it: the session is over. The
 * token is gone by then; providers/ takes the user to sign-in.
 */
export const AUTH_UNAUTHORIZED = 'auth:unauthorized'

/**
 * The API's base URL: VITE_API_BASE_URL, or /api/v1 on the app's own origin.
 * Absolute either way, since fetch outside a browser (tests) can't resolve a
 * relative URL.
 */
export const apiBaseUrl = new URL(import.meta.env.VITE_API_BASE_URL || '/api/v1', window.location.origin).href.replace(
  /\/$/,
  '',
)

/**
 * A query string as the API reads it: an array as one comma-separated value
 * (status=A,B), each value escaped but the commas between them not; an
 * empty, null or undefined value left out.
 */
export function serializeParams(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    const values = (Array.isArray(value) ? value : [value]).filter((v) => v !== undefined && v !== null && v !== '')
    if (values.length > 0) parts.push(`${encodeURIComponent(key)}=${values.map((v) => encodeURIComponent(String(v))).join(',')}`)
  }
  return parts.join('&')
}

const instance = axios.create({
  baseURL: apiBaseUrl,
  // Over fetch, which the browser has and the tests answer for.
  adapter: 'fetch',
  // The refresh cookie goes with the sign-in endpoints, also when
  // VITE_API_BASE_URL puts the API on another origin.
  withCredentials: true,
  paramsSerializer: { serialize: serializeParams },
})

instance.interceptors.request.use((config) => {
  const token = sessionStore.getState().accessToken
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.delete('Authorization')
  config.sentToken = token ?? undefined
  config.headers.set('Accept-Language', i18next.language)
  return config
})

/** Endpoints that sign in or out: a 401 from them is their answer, not an expired token. */
function isAuthEndpoint(url: string | undefined) {
  return (url ?? '').startsWith('/auth/')
}

instance.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error
  const config = error.config
  if (error.response?.status === 401 && config?.sentToken && !config.retried && !isAuthEndpoint(config.url)) {
    if (await refreshSession()) return instance.request({ ...config, retried: true })
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED))
  }
  if (!error.response) throw new ApiError(0, undefined, 'network_error')
  const body: unknown = error.response.data
  throw new ApiError(error.response.status, isErrorEnvelope(body) ? body : undefined)
})

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const { error } = value as { error: unknown }
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
}

/** A page of a list, as every list endpoint returns it. */
export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

type Params = Record<string, unknown>

/**
 * The HTTP calls the repositories make, each resolving to the response's
 * body, typed, or rejecting with an ApiError.
 */
export const http = {
  get: <T>(url: string, params?: Params) => instance.get<T>(url, { params }).then((r) => r.data),
  post: <T = void>(url: string, body?: unknown) => instance.post<T>(url, body).then((r) => r.data),
  put: <T = void>(url: string, body?: unknown) => instance.put<T>(url, body).then((r) => r.data),
  patch: <T = void>(url: string, body?: unknown) => instance.patch<T>(url, body).then((r) => r.data),
  /** A DELETE, with a body for the endpoints that take one (an outlet's confirm_name). */
  delete: <T = void>(url: string, body?: unknown) => instance.delete<T>(url, { data: body }).then((r) => r.data),
  /** A list endpoint's page: its items, and where they sit in the whole list. */
  getPaginated: <T>(url: string, params?: Params): Promise<Page<T>> =>
    instance.get<{ data: T[]; meta: ListMeta }>(url, { params }).then(({ data }) => ({
      items: data.data,
      page: data.meta.page,
      pageSize: data.meta.page_size,
      total: data.meta.total,
    })),
}

/** A path of the API's contract, below the base URL: /outlets/{oid}/menus. */
export type ApiPath = keyof paths extends infer P ? (P extends `/api/v1${infer Rest}` ? Rest : never) : never

type PathParams<P extends string> = P extends `${string}{${infer Name}}${infer Rest}` ? Name | PathParams<Rest> : never

/** The query parameters the contract gives path's GET, such as a list's q, status and page. */
export type QueryParams<P extends ApiPath> = NonNullable<
  paths[`/api/v1${P}`] extends { get: { parameters: { query?: infer Q } } } ? Q : never
>

/**
 * The URL of path with its {params} filled in, each escaped. A path the
 * contract doesn't have, or a parameter left out, fails to compile.
 */
export function apiPath<P extends ApiPath>(
  path: P,
  ...[params]: [PathParams<P>] extends [never] ? [] : [Record<PathParams<P>, string>]
): string {
  return path.replace(/\{(\w+)\}/g, (_, name: string) =>
    encodeURIComponent((params as Record<string, string> | undefined)?.[name] ?? ''),
  )
}

let inFlight: Promise<boolean> | null = null

/**
 * Trades the refresh cookie for a new access token. Calls that overlap share
 * one refresh, and tabs take turns through the Web Locks API, because a
 * rotated refresh token presented twice ends the session. Resolves to
 * whether the user is signed in afterwards; a refusal clears the session.
 * A refresh that gets no answer rejects, and leaves the session as it was.
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
    try {
      sessionStore.getState().setSession(await http.post<Session>('/auth/refresh'))
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) throw error
      if (!(error instanceof ApiError) || error.status !== 409) break
    }
  }
  sessionStore.getState().clear()
  return false
}
