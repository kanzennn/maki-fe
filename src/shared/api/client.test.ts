import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSession, type SessionResponse } from '@/shared/lib/session'
import { testUser as user } from '@/test/fixtures'

import { ApiError, createApiClient, refreshSession, unwrap } from './client'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const session = (token: string): SessionResponse => ({ access_token: token, token_type: 'Bearer', expires_in: 900, user })

/** Answers each request from routes by method and path; records them all. */
function serve(routes: Record<string, (request: Request) => Response | Promise<Response>>) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', async (request: Request) => {
    requests.push(request)
    const route = routes[`${request.method} ${new URL(request.url).pathname}`]
    return route ? route(request) : json(404, { error: { code: 'not_found', message: 'no route' } })
  })
  return requests
}

const client = createApiClient({ baseUrl: 'http://api.test' })

describe('api client', () => {
  beforeEach(() => {
    useSession.getState().clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the access token and the UI language', async () => {
    useSession.getState().setSession(session('token-1'))
    await i18n.changeLanguage('en')
    const requests = serve({ 'GET /healthz': () => json(200, { status: 'ok' }) })

    await expect(unwrap(client.GET('/healthz'))).resolves.toEqual({ status: 'ok' })
    expect(requests[0].headers.get('Authorization')).toBe('Bearer token-1')
    expect(requests[0].headers.get('Accept-Language')).toBe('en')
    expect(requests[0].credentials).toBe('include')
  })

  it('sends no Authorization header without a session', async () => {
    const requests = serve({ 'GET /healthz': () => json(200, { status: 'ok' }) })

    await unwrap(client.GET('/healthz'))
    expect(requests[0].headers.has('Authorization')).toBe(false)
  })

  it('turns the error envelope into an ApiError', async () => {
    serve({
      'GET /readyz': () =>
        json(503, { error: { code: 'not_ready', message: 'The service is not ready yet.', request_id: 'req-1' } }),
    })

    const error = await unwrap(client.GET('/readyz')).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 503, code: 'not_ready', requestId: 'req-1' })
  })

  it('treats a response without the envelope as a server error', async () => {
    serve({ 'GET /readyz': () => new Response('<html>Bad gateway</html>', { status: 502 }) })

    const error = await unwrap(client.GET('/readyz')).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ status: 502, code: 'internal_error' })
  })
})

describe('an expired access token', () => {
  beforeEach(() => {
    useSession.getState().setSession(session('expired'))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const meWith = (token: string) => (request: Request) =>
    request.headers.get('Authorization') === `Bearer ${token}`
      ? json(200, user)
      : json(401, { error: { code: 'unauthorized', message: '' } })

  it('is refreshed once and the request retried, body and all', async () => {
    const requests = serve({
      'POST /api/v1/auth/refresh': () => json(200, session('fresh')),
      'PATCH /api/v1/me': async (request) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? json(200, { ...user, locale: ((await request.json()) as { locale: string }).locale })
          : json(401, { error: { code: 'unauthorized', message: '' } }),
    })

    const me = await unwrap(client.PATCH('/api/v1/me', { body: { locale: 'en' } }))

    expect(me.locale).toBe('en')
    expect(requests.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      'PATCH /api/v1/me',
      'POST /api/v1/auth/refresh',
      'PATCH /api/v1/me',
    ])
    expect(useSession.getState().accessToken).toBe('fresh')
  })

  it('clears the session when the refresh fails too', async () => {
    serve({
      'POST /api/v1/auth/refresh': () => json(401, { error: { code: 'unauthorized', message: '' } }),
      'GET /api/v1/me': meWith('fresh'),
    })

    const error = await unwrap(client.GET('/api/v1/me')).catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 401, code: 'unauthorized' })
    expect(useSession.getState().accessToken).toBeNull()
    expect(useSession.getState().user).toBeNull()
  })

  it('is refreshed once for many requests at the same moment', async () => {
    const requests = serve({
      'POST /api/v1/auth/refresh': () => json(200, session('fresh')),
      'GET /api/v1/me': meWith('fresh'),
    })

    await Promise.all([1, 2, 3].map(() => unwrap(client.GET('/api/v1/me'))))

    expect(requests.filter((r) => r.url.endsWith('/auth/refresh'))).toHaveLength(1)
  })

  it('is not refreshed for a 401 from the sign-in endpoints themselves', async () => {
    const requests = serve({
      'POST /api/v1/auth/login': () => json(401, { error: { code: 'invalid_credentials', message: '' } }),
    })

    await unwrap(client.POST('/api/v1/auth/login', { body: { username: 'a', password: 'b', client: 'web' } })).catch(
      () => undefined,
    )

    expect(requests).toHaveLength(1)
  })
})

describe('refreshSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tries again once when another tab refreshed a moment ago', async () => {
    let calls = 0
    serve({
      'POST /api/v1/auth/refresh': () =>
        ++calls === 1
          ? json(409, { error: { code: 'refresh_superseded', message: '' } })
          : json(200, session('fresh')),
    })

    await expect(refreshSession()).resolves.toBe(true)
    expect(calls).toBe(2)
    expect(useSession.getState().accessToken).toBe('fresh')
  })

  it('sends the refresh cookie and nothing else', async () => {
    useSession.getState().clear()
    const requests = serve({ 'POST /api/v1/auth/refresh': () => json(200, session('fresh')) })

    await refreshSession()

    expect(requests[0].credentials).toBe('include')
    expect(requests[0].headers.has('Authorization')).toBe(false)
    expect(await requests[0].text()).toBe('')
  })
})
