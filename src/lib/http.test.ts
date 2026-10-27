import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Session } from '@/modules/auth/types'
import { testUser as user } from '@/test/fixtures'

import { ApiError, apiPath, AUTH_UNAUTHORIZED, http, refreshSession, serializeParams } from './http'
import { sessionStore } from './session'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const unauthorized = () => json(401, { error: { code: 'unauthorized', message: '' } })

const session = (token: string): Session => ({ access_token: token, token_type: 'Bearer', expires_in: 900, user })

/** Answers each request from routes by method and path; records them all. */
function serve(routes: Record<string, (request: Request) => Response | Promise<Response>>) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', async (request: Request) => {
    requests.push(request.clone())
    const route = routes[`${request.method} ${new URL(request.url).pathname}`]
    return route ? route(request) : json(404, { error: { code: 'not_found', message: 'no route' } })
  })
  return requests
}

const paths = (requests: Request[]) => requests.map((r) => `${r.method} ${new URL(r.url).pathname}`)

/** Counts each test's auth:unauthorized events, in the describe it is called in. */
function countUnauthorized() {
  const seen = { count: 0 }
  const listener = () => {
    seen.count++
  }
  beforeEach(() => {
    seen.count = 0
    window.addEventListener(AUTH_UNAUTHORIZED, listener)
  })
  afterEach(() => window.removeEventListener(AUTH_UNAUTHORIZED, listener))
  return seen
}

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.getState().clear()
})

describe('http', () => {
  it('sends the access token and the UI language, with the cookie', async () => {
    sessionStore.getState().setSession(session('token-1'))
    await i18n.changeLanguage('en')
    const requests = serve({ 'GET /api/v1/me': () => json(200, user) })

    await expect(http.get('/me')).resolves.toEqual(user)
    expect(requests[0].headers.get('Authorization')).toBe('Bearer token-1')
    expect(requests[0].headers.get('Accept-Language')).toBe('en')
    expect(requests[0].credentials).toBe('include')
    await i18n.changeLanguage('id')
  })

  it('sends no Authorization header without a session', async () => {
    const requests = serve({ 'GET /api/v1/permissions': () => json(200, []) })

    await http.get('/permissions')
    expect(requests[0].headers.has('Authorization')).toBe(false)
  })

  it('sends a body as JSON and resolves to the answer', async () => {
    const requests = serve({ 'POST /api/v1/outlets': async (r) => json(201, { echoed: await r.json() }) })

    await expect(http.post('/outlets', { name: 'Maki' })).resolves.toEqual({ echoed: { name: 'Maki' } })
    expect(requests[0].headers.get('Content-Type')).toContain('application/json')
  })

  it('sends a DELETE with its body, for the endpoints that take one', async () => {
    const requests = serve({ 'DELETE /api/v1/outlets/o1': () => new Response(null, { status: 204 }) })

    await expect(http.delete('/outlets/o1', { confirm_name: 'Maki Bandung' })).resolves.toBeFalsy()
    expect(await requests[0].json()).toEqual({ confirm_name: 'Maki Bandung' })
  })

  it('turns the error envelope into an ApiError', async () => {
    serve({
      'GET /api/v1/outlets/o1': () =>
        json(404, { error: { code: 'outlet_not_found', message: 'No such outlet.', request_id: 'req-1' } }),
    })

    const error = await http.get('/outlets/o1').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'outlet_not_found', requestId: 'req-1', message: 'No such outlet.' })
  })

  it('treats an answer without the envelope as a server error', async () => {
    serve({ 'GET /api/v1/me': () => new Response('<html>Bad gateway</html>', { status: 502 }) })

    const error = await http.get('/me').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'internal_error' })
  })

  it('turns no answer at all into an ApiError with status 0', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))

    const error = await http.get('/me').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, code: 'network_error' })
  })

  it('sends an array as one comma-separated value, and leaves empty values out', async () => {
    const requests = serve({ 'GET /api/v1/outlets': () => json(200, { data: [], meta: { page: 1, page_size: 20, total: 0 } }) })

    await http.get('/outlets', { status: ['active', 'inactive'], q: '', page: 2, role_id: undefined })
    expect(new URL(requests[0].url).search).toBe('?status=active,inactive&page=2')
  })

  it('gives a list endpoint its items and their place in the list', async () => {
    serve({
      'GET /api/v1/outlets': () => json(200, { data: [{ outlet_id: 'o1' }], meta: { page: 2, page_size: 20, total: 21 } }),
    })

    await expect(http.getPaginated('/outlets', { page: 2 })).resolves.toEqual({
      items: [{ outlet_id: 'o1' }],
      page: 2,
      pageSize: 20,
      total: 21,
    })
  })
})

describe('serializeParams', () => {
  it('escapes each value but not the commas between them', () => {
    expect(serializeParams({ q: 'nasi goreng & teh', tags: ['a,b', 'c'] })).toBe('q=nasi%20goreng%20%26%20teh&tags=a%2Cb,c')
  })

  it('keeps false and 0, which are values', () => {
    expect(serializeParams({ active: false, page: 0, none: null })).toBe('active=false&page=0')
  })
})

describe('apiPath', () => {
  it('fills in and escapes the path parameters', () => {
    expect(apiPath('/outlets/{oid}/menus/{mid}', { oid: 'o 1', mid: 'm/2' })).toBe('/outlets/o%201/menus/m%2F2')
    expect(apiPath('/outlets')).toBe('/outlets')
  })

  it("takes only the contract's paths, with all their parameters", () => {
    // @ts-expect-error: the contract has no such path
    expect(() => apiPath('/outlet')).not.toThrow()
    // @ts-expect-error: the path needs its oid
    expect(apiPath('/outlets/{oid}')).toBe('/outlets/')
  })
})

describe('an expired access token', () => {
  const seen = countUnauthorized()

  beforeEach(() => {
    sessionStore.getState().setSession(session('expired'))
  })

  const meWith = (token: string) => (request: Request) =>
    request.headers.get('Authorization') === `Bearer ${token}` ? json(200, user) : unauthorized()

  it('is refreshed once and the request sent again, body and all', async () => {
    const requests = serve({
      'POST /api/v1/auth/refresh': () => json(200, session('fresh')),
      'PATCH /api/v1/me': async (request) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? json(200, { ...user, locale: ((await request.json()) as { locale: string }).locale })
          : unauthorized(),
    })

    const me = await http.patch<typeof user>('/me', { locale: 'en' })

    expect(me.locale).toBe('en')
    expect(paths(requests)).toEqual(['PATCH /api/v1/me', 'POST /api/v1/auth/refresh', 'PATCH /api/v1/me'])
    expect(sessionStore.getState().accessToken).toBe('fresh')
    expect(seen.count).toBe(0)
  })

  it('ends the session, with auth:unauthorized, when the refresh fails too', async () => {
    serve({ 'POST /api/v1/auth/refresh': unauthorized, 'GET /api/v1/me': meWith('fresh') })

    const error = await http.get('/me').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 401, code: 'unauthorized' })
    expect(sessionStore.getState().accessToken).toBeNull()
    expect(sessionStore.getState().user).toBeNull()
    expect(seen.count).toBe(1)
  })

  it('is refreshed once for many requests at the same moment', async () => {
    const requests = serve({ 'POST /api/v1/auth/refresh': () => json(200, session('fresh')), 'GET /api/v1/me': meWith('fresh') })

    await Promise.all([1, 2, 3].map(() => http.get('/me')))

    expect(requests.filter((r) => r.url.endsWith('/auth/refresh'))).toHaveLength(1)
  })

  it('is not refreshed twice for one request: a 401 after the refresh is the answer', async () => {
    const requests = serve({ 'POST /api/v1/auth/refresh': () => json(200, session('fresh')), 'GET /api/v1/me': unauthorized })

    const error = await http.get('/me').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 401 })
    expect(paths(requests)).toEqual(['GET /api/v1/me', 'POST /api/v1/auth/refresh', 'GET /api/v1/me'])
    expect(sessionStore.getState().accessToken).toBe('fresh')
    expect(seen.count).toBe(0)
  })

  it('is not refreshed for a 401 from the sign-in endpoints themselves', async () => {
    const requests = serve({
      'POST /api/v1/auth/login': () => json(401, { error: { code: 'invalid_credentials', message: '' } }),
    })

    const error = await http.post('/auth/login', { username: 'a', password: 'b', client: 'web' }).catch((c: unknown) => c)

    expect(error).toMatchObject({ status: 401, code: 'invalid_credentials' })
    expect(requests).toHaveLength(1)
    expect(seen.count).toBe(0)
  })

  it('keeps the session when the refresh gets no answer', async () => {
    vi.stubGlobal('fetch', (request: Request) =>
      request.url.endsWith('/auth/refresh') ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(unauthorized()),
    )

    const error = await http.get('/me').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 0, code: 'network_error' })
    expect(sessionStore.getState().accessToken).toBe('expired')
    expect(seen.count).toBe(0)
  })
})

describe('a 401 without a token', () => {
  const seen = countUnauthorized()

  it('is the answer: nothing is refreshed and no session ends', async () => {
    const requests = serve({ 'GET /api/v1/me': unauthorized })

    const error = await http.get('/me').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 401 })
    expect(requests).toHaveLength(1)
    expect(seen.count).toBe(0)
  })
})

describe('refreshSession', () => {
  it('tries again once when another tab refreshed a moment ago', async () => {
    let calls = 0
    serve({
      'POST /api/v1/auth/refresh': () =>
        ++calls === 1 ? json(409, { error: { code: 'refresh_superseded', message: '' } }) : json(200, session('fresh')),
    })

    await expect(refreshSession()).resolves.toBe(true)
    expect(calls).toBe(2)
    expect(sessionStore.getState().accessToken).toBe('fresh')
  })

  it('gives up after the second 409, and clears the session', async () => {
    sessionStore.getState().setSession(session('old'))
    serve({ 'POST /api/v1/auth/refresh': () => json(409, { error: { code: 'refresh_superseded', message: '' } }) })

    await expect(refreshSession()).resolves.toBe(false)
    expect(sessionStore.getState().accessToken).toBeNull()
  })

  it('sends the refresh cookie and nothing else', async () => {
    const requests = serve({ 'POST /api/v1/auth/refresh': () => json(200, session('fresh')) })

    await refreshSession()

    expect(requests[0].credentials).toBe('include')
    expect(requests[0].headers.has('Authorization')).toBe(false)
    expect(await requests[0].text()).toBe('')
  })
})
