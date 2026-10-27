import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { routeDefaults } from '@/providers/route-defaults'
import { routeTree } from '@/routeTree.gen'
import { sessionStore } from '@/lib/session'
import type { Me } from '@/modules/auth/types'
import { testManager, testUser } from '@/test/fixtures'
import { unregisteredTill } from '@/test/pos'

import { ensureSession } from '@/modules/auth/usecases/ensure-session.usecase'
import { safeRedirect } from '@/modules/auth/usecases/safe-redirect.usecase'

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
const apiError = (status: number, code: string, details?: Record<string, unknown>) =>
  json(status, { error: { code, message: `server: ${code}`, details } })

/** Answers the app's API calls from routes; records each request. */
function serve(routes: Record<string, (request: Request) => Response | Promise<Response>>) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', async (request: Request) => {
    requests.push(request.clone())
    const route = routes[`${request.method} ${new URL(request.url).pathname}`]
    return route ? route(request) : apiError(401, 'unauthorized')
  })
  return requests
}

function renderApp(path: string) {
  const queryClient = new QueryClient()
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient, auth: { ensureSession, user: () => sessionStore.getState().user } },
    ...routeDefaults,
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const session = (user: Me = testUser) => ({ access_token: 'access-1', token_type: 'Bearer', expires_in: 900, user })

beforeEach(() => {
  sessionStore.getState().clear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sign-in', () => {
  it('signs in and goes where the visitor was headed', async () => {
    const requests = serve({ 'POST /api/v1/auth/login': () => json(200, session()), ...unregisteredTill() })
    const router = renderApp('/login?redirect=%2Fpos')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username'), 'kasir1')
    await user.type(screen.getByLabelText('Password'), 'kopi susu 123')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Perangkat ini belum terdaftar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pos')
    const login = requests.find((r) => r.url.endsWith('/auth/login'))
    expect(await login?.json()).toEqual({ username: 'kasir1', password: 'kopi susu 123', client: 'web' })
    expect(sessionStore.getState().accessToken).toBe('access-1')
  })

  it('shows why sign-in failed, in the interface language', async () => {
    serve({ 'POST /api/v1/auth/login': () => apiError(401, 'invalid_credentials') })
    renderApp('/login')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username'), 'kasir1')
    await user.type(screen.getByLabelText('Password'), 'salah')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Username atau password salah.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('says how long to wait when rate limited', async () => {
    serve({ 'POST /api/v1/auth/login': () => apiError(429, 'rate_limited', { retry_after: 600 }) })
    renderApp('/login')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username'), 'kasir1')
    await user.type(screen.getByLabelText('Password'), 'salah')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Coba lagi dalam 10 menit.')
  })

  it('checks the fields before calling the server', async () => {
    const requests = serve({})
    renderApp('/login')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Masuk' }))

    expect(await screen.findAllByText('Wajib diisi.')).toHaveLength(2)
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
    expect(requests.filter((r) => r.url.endsWith('/auth/login'))).toHaveLength(0)
  })

  it('sends a user with a temporary password to change it first', async () => {
    serve({
      'POST /api/v1/auth/login': () => json(200, session({ ...testUser, must_change_password: true })),
    })
    const router = renderApp('/login')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username'), 'kasir1')
    await user.type(screen.getByLabelText('Password'), 'sandi sementara')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ganti password' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/change-password')
  })
})

describe('the session', () => {
  it('is restored from the refresh cookie after a reload', async () => {
    serve({ 'POST /api/v1/auth/refresh': () => json(200, session(testManager)) })
    renderApp('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument()
    expect(screen.getByText('Rina')).toBeInTheDocument()
  })

  it('signs out on the server and goes back to sign-in', async () => {
    let signedOut = false
    const requests = serve({
      // Like the server: once signed out, the cookie no longer refreshes.
      'POST /api/v1/auth/refresh': () => (signedOut ? apiError(401, 'unauthorized') : json(200, session())),
      'POST /api/v1/auth/logout': () => {
        signedOut = true
        return json(204, undefined)
      },
    })
    const router = renderApp('/admin')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Keluar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Masuk' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({})
    expect(requests.some((r) => r.url.endsWith('/auth/logout'))).toBe(true)
    expect(sessionStore.getState().accessToken).toBeNull()
  })

  it('only redirects inside the app after sign-in', () => {
    expect(safeRedirect('/pos?table=4')).toBe('/pos?table=4')
    for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', 'pos', undefined, 5]) {
      expect(safeRedirect(bad)).toBe('/admin')
    }
  })
})

describe('password reset', () => {
  it('takes the token from the link, drops it from the address, and resets', async () => {
    const requests = serve({ 'POST /api/v1/auth/password/reset': () => json(204, undefined) })
    const router = renderApp('/reset-password#token=link-token-1')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Password baru'), 'sandi baru panjang')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'sandi baru panjang')
    await waitFor(() => expect(router.state.location.hash).toBe(''))
    expect(router.state.location.pathname).toBe('/reset-password')
    await user.click(screen.getByRole('button', { name: 'Simpan password' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Password sudah diganti.')
    const reset = requests.find((r) => r.url.endsWith('/password/reset'))
    expect(await reset?.json()).toEqual({ token: 'link-token-1', new_password: 'sandi baru panjang' })
  })

  it('checks the new password twice before sending', async () => {
    serve({})
    renderApp('/reset-password#token=link-token-1')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Password baru'), 'pendek')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'lain')
    await user.click(screen.getByRole('button', { name: 'Simpan password' }))

    expect(await screen.findByText('Minimal 8 karakter.', { selector: '[id$="-error"]' })).toBeInTheDocument()
    expect(screen.getByText('Password tidak sama.')).toBeInTheDocument()
  })

  it('offers a new link when the token is no longer valid', async () => {
    serve({ 'POST /api/v1/auth/password/reset': () => apiError(400, 'token_invalid') })
    renderApp('/reset-password#token=used')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Password baru'), 'sandi baru panjang')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'sandi baru panjang')
    await user.click(screen.getByRole('button', { name: 'Simpan password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Link ini sudah tidak berlaku.')
    expect(screen.getByRole('link', { name: 'Minta link baru' })).toHaveAttribute('href', '/forgot-password')
  })

  it('explains a link without a token', async () => {
    serve({})
    renderApp('/reset-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('Link ini tidak lengkap.')
  })
})

describe('forgot password', () => {
  it('always answers the same', async () => {
    serve({ 'POST /api/v1/auth/password/forgot': () => json(202, undefined) })
    renderApp('/forgot-password')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username atau email'), 'pemilik')
    await user.click(screen.getByRole('button', { name: 'Kirim link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Jika akun terdaftar, link reset sudah dikirim.')
  })
})

describe('email verification', () => {
  it('waits for a press, then confirms', async () => {
    const requests = serve({ 'POST /api/v1/auth/email/verify': () => json(204, undefined) })
    renderApp('/verify-email#token=verify-1')
    const user = userEvent.setup()

    const button = await screen.findByRole('button', { name: 'Konfirmasi email' })
    expect(requests.filter((r) => r.url.endsWith('/email/verify'))).toHaveLength(0)
    await user.click(button)

    expect(await screen.findByRole('status')).toHaveTextContent('Email sudah dikonfirmasi.')
    expect(await requests.find((r) => r.url.endsWith('/email/verify'))?.json()).toEqual({ token: 'verify-1' })
  })
})

describe('changing the password', () => {
  it('changes it and lets a held user through', async () => {
    serve({
      'POST /api/v1/auth/refresh': () => json(200, session({ ...testManager, must_change_password: true })),
      'PUT /api/v1/me/password': () => json(204, undefined),
      'GET /api/v1/me': () => json(200, testManager),
    })
    const router = renderApp('/change-password')
    const user = userEvent.setup()

    expect(await screen.findByText(/Password Anda dibuat oleh orang lain/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Password saat ini'), 'sandi sementara')
    await user.type(screen.getByLabelText('Password baru'), 'sandi pilihan sendiri')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'sandi pilihan sendiri')
    await user.click(screen.getByRole('button', { name: 'Simpan password' }))
    await user.click(await screen.findByRole('button', { name: 'Lanjut' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('shows a wrong current password', async () => {
    serve({
      'POST /api/v1/auth/refresh': () => json(200, session()),
      'PUT /api/v1/me/password': () => apiError(422, 'wrong_password'),
    })
    renderApp('/change-password')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Password saat ini'), 'salah')
    await user.type(screen.getByLabelText('Password baru'), 'sandi pilihan sendiri')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'sandi pilihan sendiri')
    await user.click(screen.getByRole('button', { name: 'Simpan password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Password saat ini salah.')
  })
})
