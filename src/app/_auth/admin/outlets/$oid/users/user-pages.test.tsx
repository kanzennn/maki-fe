import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import {
  listOf,
  testManager,
  testManagerStaff,
  testOutlet,
  testOwner,
  testRoles,
  testStaff,
  testSupervisor,
} from '@/test/fixtures'

const roles = () => json(200, listOf(testRoles))

describe('the user list', () => {
  it("shows each account's role and last sign-in, in the outlet's time zone", async () => {
    serve({
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testManagerStaff, testStaff])),
      'GET /api/v1/outlets/o1/roles': roles,
    })
    renderApp('/admin/outlets/o1/users', testManager)

    const budi = (await screen.findByRole('link', { name: 'Budi' })).closest('tr')!
    expect(within(budi).getByText('@kasir1')).toBeInTheDocument()
    expect(within(budi).getByText('Kasir')).toBeInTheDocument()
    // 01:15 UTC is 08:15 in Jakarta.
    expect(within(budi).getByText('30 Sep 2026, 08.15')).toBeInTheDocument()
    const rina = screen.getByRole('link', { name: 'Rina' }).closest('tr')!
    expect(within(rina).getByText('Manager')).toBeInTheDocument()
  })

  it('filters by role', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
      'GET /api/v1/outlets/o1/roles': roles,
    })
    renderApp('/admin/outlets/o1/users', testManager)
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Role'), 'Dapur')
    await waitFor(() =>
      expect(
        requests.some(
          (r) => new URL(r.url).pathname === '/api/v1/outlets/o1/users' && r.url.includes('role_id=r-dapur'),
        ),
      ).toBe(true),
    )
  })
})

describe('a new account', () => {
  async function fillIn(password = 'sementara 123') {
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nama'), 'Dewi')
    await user.type(screen.getByLabelText('Username'), 'Dewi.K')
    await user.type(screen.getByLabelText('Password sementara'), password)
    await user.type(screen.getByLabelText('Ulangi password sementara'), password)
    return user
  }

  it('is a Manager, with no role, when the Owner adds it', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/roles': roles,
      'POST /api/v1/outlets/o1/users': () => json(201, { ...testManagerStaff, user_id: 'm2', name: 'Dewi' }),
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testManagerStaff])),
    })
    const { router } = renderApp('/admin/outlets/o1/users/new', testOwner)

    expect(await screen.findByRole('heading', { level: 2, name: 'Tambah Manager' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Simpan Manager' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/outlets/o1/users'))
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/users')).toEqual({
      name: 'Dewi',
      username: 'dewi.k',
      email: null,
      phone: null,
      password: 'sementara 123',
      role_id: null,
      is_manager: true,
    })
  })

  it('is staff with a role the adder holds all of', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/roles': roles,
      'POST /api/v1/outlets/o1/users': () => json(201, testStaff),
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
    })
    renderApp('/admin/outlets/o1/users/new', testSupervisor)

    const role = await screen.findByLabelText('Role')
    expect(within(role).getAllByRole('option').map((o) => o.textContent)).toEqual(['Pilih role', 'Kasir'])
    expect(role).toHaveAccessibleDescription('Role yang punya izin di luar izin Anda tidak ditampilkan.')

    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Simpan user' }))
    expect(role).toHaveAccessibleDescription(/Wajib diisi/)
    await user.selectOptions(role, 'Kasir')
    await user.click(screen.getByRole('button', { name: 'Simpan user' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/users')).toMatchObject({
      role_id: 'r-kasir',
      is_manager: false,
    })
  })

  it("shows the server's refusals on their fields", async () => {
    serve({
      'GET /api/v1/outlets/o1/roles': roles,
      'POST /api/v1/outlets/o1/users': () => apiError(409, 'username_taken'),
    })
    renderApp('/admin/outlets/o1/users/new', testManager)
    const user = await fillIn()
    await user.selectOptions(screen.getByLabelText('Role'), 'Kasir')
    await user.click(screen.getByRole('button', { name: 'Simpan user' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(/Username ini sudah dipakai/),
    )
  })
})

describe("an account's page", () => {
  it("is read only for one's own account", async () => {
    serve({
      'GET /api/v1/outlets/o1/users/m1': () => json(200, testManagerStaff),
      'GET /api/v1/outlets/o1/roles': roles,
    })
    renderApp('/admin/outlets/o1/users/m1', testManager)

    expect(await screen.findByText(/Ini akun Anda sendiri/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ganti password Anda' })).toHaveAttribute('href', '/change-password')
    expect(screen.queryByLabelText('Nama')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument()
  })

  it('lets the Owner only promote staff', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/users/u1': () => json(200, testStaff),
      'GET /api/v1/outlets/o1/roles': roles,
      'PUT /api/v1/outlets/o1/users/u1': () => json(200, { ...testStaff, is_manager: true, role: null }),
    })
    renderApp('/admin/outlets/o1/users/u1', testOwner)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Jadikan Manager' }))
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Jadikan Manager' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Budi sekarang Manager.')
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/users/u1')).toEqual({
      name: 'Budi',
      email: null,
      phone: null,
      is_manager: true,
      role_id: null,
    })
  })

  it('lets the Owner make a Manager staff again, with any role', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/users/m1': () => json(200, testManagerStaff),
      'GET /api/v1/outlets/o1/roles': roles,
      'PUT /api/v1/outlets/o1/users/m1': () => json(200, { ...testManagerStaff, is_manager: false }),
    })
    renderApp('/admin/outlets/o1/users/m1', testOwner)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Jadikan staf' }))
    const dialog = screen.getByRole('dialog')
    // The Owner holds neither permission, yet a Manager held both: any role will do.
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Dapur')
    await user.click(within(dialog).getByRole('button', { name: 'Jadikan staf' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Rina sekarang staf.')
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/users/m1')).toMatchObject({
      is_manager: false,
      role_id: 'r-dapur',
    })
  })

  it('gives staff a temporary password', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/users/u1': () => json(200, testStaff),
      'GET /api/v1/outlets/o1/roles': roles,
      'POST /api/v1/outlets/o1/users/u1/reset-password': () => json(204),
    })
    renderApp('/admin/outlets/o1/users/u1', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Reset password' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Password sementara'), 'sementara 789')
    await user.type(within(dialog).getByLabelText('Ulangi password sementara'), 'sementara 789')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan password sementara' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Password sementara Budi disimpan.')
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/users/u1/reset-password')).toEqual({
      password: 'sementara 789',
    })
  })

  it("keeps a supervisor from staff who hold more than they do", async () => {
    serve({
      'GET /api/v1/outlets/o1/users/u2': () =>
        json(200, { ...testStaff, user_id: 'u2', role: { role_id: 'r-dapur', name: 'Dapur' } }),
      'GET /api/v1/outlets/o1/roles': roles,
    })
    renderApp('/admin/outlets/o1/users/u2', testSupervisor)

    expect(await screen.findByText(/punya izin yang tidak Anda punya/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nonaktifkan' })).not.toBeInTheDocument()
  })

  it('deactivates staff after asking', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/users/u1': () => json(200, testStaff),
      'GET /api/v1/outlets/o1/roles': roles,
      'PATCH /api/v1/outlets/o1/users/u1/status': () => json(200, { ...testStaff, status: 'inactive' }),
    })
    renderApp('/admin/outlets/o1/users/u1', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nonaktifkan' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Nonaktifkan' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Budi dinonaktifkan.')
    expect(await bodyOf(requests, 'PATCH', '/api/v1/outlets/o1/users/u1/status')).toEqual({ status: 'inactive' })
    expect(screen.getByRole('button', { name: 'Aktifkan' })).toBeInTheDocument()
  })
})
