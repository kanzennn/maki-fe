import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testOutlet, testOwner, testRoles, testStaff, testSupervisor, testUser } from '@/test/fixtures'
import { unregisteredTill } from '@/test/pos'

/** What /pos opens with on a device that isn't one of the outlet's yet. */
const till = 'Perangkat ini belum terdaftar'

describe('routing', () => {
  it('sends a visitor without a session to the sign-in page, remembering where they were going', async () => {
    serve({})
    const { router } = renderApp('/pos?table=4', null)

    expect(await screen.findByRole('heading', { level: 1, name: 'Masuk' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toEqual({ redirect: '/pos?table=4' })
  })

  it('opens the areas behind the session guard', async () => {
    serve(unregisteredTill())
    renderApp('/pos', testUser)

    expect(await screen.findByRole('heading', { level: 1, name: till })).toBeInTheDocument()
  })

  it('holds a user who must change their password on that screen', async () => {
    const { router } = renderApp('/admin', { ...testManager, must_change_password: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Ganti password' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/change-password')
  })

  it('sends / to the admin area when signed in, and to sign-in otherwise', async () => {
    const { router } = renderApp('/', testManager)
    expect(await screen.findByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('skips the sign-in form with a live session', async () => {
    serve(unregisteredTill())
    const { router } = renderApp('/login?redirect=%2Fpos', testUser)
    expect(await screen.findByRole('heading', { level: 1, name: till })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pos')
  })

  it('shows the not-found page for unknown paths', async () => {
    serve({})
    renderApp('/does-not-exist', null)

    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/')
  })
})

/** The names in the sidebar, in order. */
function sidebar() {
  const nav = screen.getAllByRole('navigation', { name: 'Menu utama' })[0]
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

describe('the admin area', () => {
  it("shows the Owner the dashboard and the outlets, not an outlet's own pages", async () => {
    renderApp('/admin', testOwner)

    expect(await screen.findByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument()
    expect(sidebar()).toEqual(['Dasbor', 'Outlet', 'Voucher'])
  })

  it("shows a Manager their outlet's pages and the cashier, and which one is open", async () => {
    serve({
      'GET /api/v1/outlets/o1/roles': () => json(200, listOf(testRoles)),
    })
    renderApp('/admin/outlets/o1/roles', testManager)

    expect(await screen.findByRole('heading', { level: 1, name: 'Role' })).toBeInTheDocument()
    expect(sidebar()).toEqual(['Dasbor', 'Menu', 'Meja', 'Role', 'User', 'Perangkat', 'Voucher', 'Kasir'])
    const nav = screen.getAllByRole('navigation', { name: 'Menu utama' })[0]
    expect(within(nav).getByRole('link', { name: 'Role' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Dasbor' })).not.toHaveAttribute('aria-current')
  })

  it('sends a cashier from the admin area to the cashier', async () => {
    serve(unregisteredTill())
    const { router } = renderApp('/admin', testUser)

    expect(await screen.findByRole('heading', { level: 1, name: till })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pos')
  })

  it('starts staff on the first page their role opens', async () => {
    serve({
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
      'GET /api/v1/outlets/o1/roles': () => json(200, listOf(testRoles)),
    })
    const { router } = renderApp('/admin', testSupervisor)

    expect(await screen.findByRole('heading', { level: 1, name: 'User' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/outlets/o1/users')
    // Devices are the Manager's.
    expect(sidebar()).toEqual(['User', 'Kasir'])
  })

  it('starts staff who may read tables on the tables page', async () => {
    serve({
      'GET /api/v1/outlets/o1/areas': () => json(200, listOf([])),
      'GET /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'table' }),
    })
    const { router } = renderApp('/admin', { ...testUser, permissions: ['table.view'] })

    expect(await screen.findByRole('heading', { level: 1, name: 'Meja' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/outlets/o1/tables')
    expect(sidebar()).toEqual(['Meja'])
  })

  it('says so to a user whose permissions open no page yet', async () => {
    // The Log Action has no page yet.
    const { router } = renderApp('/admin', { ...testUser, permissions: ['log.view'] })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Belum ada halaman untuk akun Anda' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/no-access')
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeInTheDocument()
  })

  it.each([
    ['a Manager', '/admin/outlets', testManager],
    ["another outlet's users", '/admin/outlets/o2/users', testManager],
    ['roles without role.view', '/admin/outlets/o1/roles', testSupervisor],
    ['a new user without user.manage', '/admin/outlets/o1/users/new', { ...testManager, permissions: ['user.view'] }],
    ['menus without menu.view', '/admin/outlets/o1/menus', testSupervisor],
    ['categories without menu.view', '/admin/outlets/o1/menus/categories', testSupervisor],
    ['a new menu without menu.manage', '/admin/outlets/o1/menus/new', { ...testManager, permissions: ['menu.view'] }],
    ['tables without table.view', '/admin/outlets/o1/tables', testSupervisor],
    ['areas without table.view', '/admin/outlets/o1/tables/areas', testSupervisor],
    ['schedules without table.view', '/admin/outlets/o1/tables/schedules', testSupervisor],
    ['the layout editor without table.manage', '/admin/outlets/o1/tables/layout/a1', { ...testManager, permissions: ['table.view'] }],
    ['a new schedule without table.manage', '/admin/outlets/o1/tables/schedules/new', { ...testManager, permissions: ['table.view'] }],
    ['a schedule without table.view', '/admin/outlets/o1/tables/schedules/s1', testSupervisor],
    ['a change to a schedule without table.manage', '/admin/outlets/o1/tables/schedules/s1/edit', { ...testManager, permissions: ['table.view'] }],
  ])('keeps %s out, back on their own start page', async (_, path, user) => {
    serve({
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
      'GET /api/v1/outlets/o1/roles': () => json(200, listOf(testRoles)),
      'GET /api/v1/outlets/o1/menus': () => json(200, listOf([])),
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf([])),
      'GET /api/v1/outlets/o1/areas': () => json(200, listOf([])),
      'GET /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'table' }),
    })
    const { router } = renderApp(path, user)

    await screen.findByRole('heading', { level: 1 })
    expect(router.state.location.pathname).not.toBe(path)
  })

  it('keeps the Owner out of the cashier', async () => {
    const { router } = renderApp('/pos', testOwner)

    expect(await screen.findByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it("shows an outlet that doesn't exist as not found, inside the admin area", async () => {
    serve({ 'GET /api/v1/outlets/gone': () => json(404, { error: { code: 'outlet_not_found', message: '' } }) })
    renderApp('/admin/outlets/gone', testOwner)

    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })).toBeInTheDocument()
    expect(sidebar()).toEqual(['Dasbor', 'Outlet', 'Voucher'])
  })

  it("opens an outlet's pages for the Owner under its name, with tabs", async () => {
    serve({ 'GET /api/v1/outlets/o1': () => json(200, testOutlet) })
    renderApp('/admin/outlets/o1', testOwner)

    expect(await screen.findByRole('heading', { level: 1, name: 'Maki Bandung' })).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Bagian outlet' })
    expect(within(tabs).getByRole('link', { name: 'Info' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getAllByRole('link').map((link) => link.textContent)).toEqual(['Info', 'User', 'Role', 'Menu', 'Meja', 'Perangkat', 'Voucher'])
    expect(screen.getByRole('heading', { level: 2, name: 'Detail outlet' })).toBeInTheDocument()
  })
})
