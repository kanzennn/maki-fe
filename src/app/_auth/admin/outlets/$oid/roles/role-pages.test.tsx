import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testCatalog, testManager, testOutlet, testOwner, testRoles, testUser } from '@/test/fixtures'

const kasir = {
  ...testRoles[0],
  users: [{ user_id: 'u1', name: 'Budi', username: 'kasir1' }],
}
const unused = { ...testRoles[1], users: [] }

describe('the role list', () => {
  it('shows each role with how many permissions and users it has', async () => {
    serve({ 'GET /api/v1/outlets/o1/roles': () => json(200, listOf(testRoles)) })
    renderApp('/admin/outlets/o1/roles', testManager)

    // The sidebar has a Kasir too: the cashier.
    const main = within(await screen.findByRole('main'))
    const row = (await main.findByRole('link', { name: 'Kasir' })).closest('tr')!
    expect(within(row).getByText('1 izin')).toBeInTheDocument()
    expect(within(row).getByText('1 user')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tambah role' })).toBeInTheDocument()
  })
})

describe('a new role', () => {
  it('ticks seeing something along with managing it, and sends the codes sorted', async () => {
    const requests = serve({
      'GET /api/v1/permissions': () => json(200, testCatalog),
      'POST /api/v1/outlets/o1/roles': () => json(201, { ...unused, name: 'HR' }),
      'GET /api/v1/outlets/o1/roles': () => json(200, listOf(testRoles)),
    })
    const { router } = renderApp('/admin/outlets/o1/roles/new', testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Nama role'), 'HR')
    await user.click(screen.getByLabelText('Buat, ubah & hapus user'))
    expect(screen.getByLabelText('Lihat user')).toBeChecked()
    await user.click(screen.getByLabelText('Lihat meja'))
    await user.click(screen.getByLabelText('Lihat meja'))
    expect(screen.getByLabelText('Lihat meja')).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Simpan role' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/outlets/o1/roles'))
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/roles')).toEqual({
      name: 'HR',
      description: null,
      permissions: ['user.manage', 'user.view'],
    })
  })

  it("won't give a permission the user lacks", async () => {
    serve({ 'GET /api/v1/permissions': () => json(200, testCatalog) })
    renderApp('/admin/outlets/o1/roles/new', { ...testUser, permissions: ['role.manage', 'role.view', 'user.view'] })

    const menu = await screen.findByLabelText('Lihat menu')
    expect(menu).toBeDisabled()
    expect(menu).toHaveAccessibleDescription('Anda tidak punya izin ini, jadi tidak bisa memberikannya.')
    expect(screen.getByLabelText('Lihat user')).toBeEnabled()
  })

  it('shows a taken name on the name field', async () => {
    serve({
      'GET /api/v1/permissions': () => json(200, testCatalog),
      'POST /api/v1/outlets/o1/roles': () => apiError(409, 'role_name_taken'),
    })
    renderApp('/admin/outlets/o1/roles/new', testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Nama role'), 'Kasir')
    await user.click(screen.getByRole('button', { name: 'Simpan role' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Nama role')).toHaveAccessibleDescription(
        'Nama ini sudah dipakai role lain di outlet ini.',
      ),
    )
  })
})

describe("a role's page", () => {
  it('keeps a permission the role had, even one the editor lacks, but only to drop', async () => {
    serve({
      'GET /api/v1/permissions': () => json(200, testCatalog),
      'GET /api/v1/outlets/o1/roles/r-dapur': () => json(200, unused),
    })
    renderApp('/admin/outlets/o1/roles/r-dapur', { ...testUser, permissions: ['role.manage', 'role.view'] })

    expect(await screen.findByLabelText('Tambah/kurangi stok & atur stok alert')).toBeEnabled()
    expect(screen.getByLabelText('Tambah/kurangi stok & atur stok alert')).toBeChecked()
    expect(screen.getByLabelText('Lihat dasbor outlet')).toBeDisabled()
  })

  it("shows the Owner a role's permissions and holders, without a form", async () => {
    serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/permissions': () => json(200, testCatalog),
      'GET /api/v1/outlets/o1/roles/r-kasir': () => json(200, kasir),
    })
    renderApp('/admin/outlets/o1/roles/r-kasir', testOwner)

    expect(await screen.findByRole('heading', { level: 2, name: 'Kasir' })).toBeInTheDocument()
    expect(screen.getByText('Bertransaksi di kasir')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Budi' })).toHaveAttribute('href', '/admin/outlets/o1/users/u1')
    expect(screen.queryByRole('button', { name: 'Simpan perubahan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus role' })).not.toBeInTheDocument()
  })

  it('names the users to move before a role can go', async () => {
    serve({
      'GET /api/v1/permissions': () => json(200, testCatalog),
      'GET /api/v1/outlets/o1/roles/r-kasir': () => json(200, kasir),
    })
    renderApp('/admin/outlets/o1/roles/r-kasir', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hapus role' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/masih dipegang 1 user/)).toBeInTheDocument()
    expect(within(dialog).getByText('Budi')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Hapus role' })).not.toBeInTheDocument()
  })

  it("names them from the server's answer too, when someone got the role meanwhile", async () => {
    serve({
      'GET /api/v1/permissions': () => json(200, testCatalog),
      'GET /api/v1/outlets/o1/roles/r-dapur': () => json(200, unused),
      'DELETE /api/v1/outlets/o1/roles/r-dapur': () =>
        apiError(409, 'role_in_use', { users: [{ user_id: 'u9', name: 'Dewi' }] }),
    })
    renderApp('/admin/outlets/o1/roles/r-dapur', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hapus role' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Hapus role' }))

    expect(await within(dialog).findByText('Dewi')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Hapus role' })).not.toBeInTheDocument()
  })
})
