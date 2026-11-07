import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testOutlet, testOwner, testStaff, testUser } from '@/test/fixtures'

const entry = (overrides: Record<string, unknown>) => ({
  action_log_id: 'a1',
  action: 'menu.updated',
  target_type: 'menu',
  target_id: 'm1',
  user: { user_id: 'm1', name: 'Rina', is_owner: false, is_manager: true, role_name: null },
  outlet: { outlet_id: 'o1', code: 'BDG01', name: 'Maki Bandung' },
  device: null,
  before: { name: 'Kopi', price: 10000 },
  after: { name: 'Kopi Susu', price: 12000 },
  ip: '203.0.113.9',
  occurred_at: '2026-10-01T01:15:00Z',
  created_at: '2026-10-01T01:15:01Z',
  ...overrides,
})

describe('the outlet log', () => {
  it('shows who did what, and what changed', async () => {
    serve({
      'GET /api/v1/outlets/o1/logs': () => json(200, listOf([entry({})])),
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
    })
    renderApp('/admin/outlets/o1/logs', testManager)

    const row = (await screen.findByText('Menu diubah')).closest('tr')!
    expect(within(row).getByText('Rina')).toBeInTheDocument()
    expect(within(row).getByText('Manager')).toBeInTheDocument()
    expect(within(row).getByText('Menu: Kopi Susu')).toBeInTheDocument()
    // 01:15 UTC is 08:15 in Jakarta.
    expect(within(row).getByText(/08[.:]15/)).toBeInTheDocument()

    await userEvent.click(within(row).getByRole('button', { name: 'Lihat detail Menu diubah' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('cell', { name: '10000' })).toBeInTheDocument()
    expect(within(dialog).getByRole('cell', { name: '12000' })).toBeInTheDocument()
  })

  it('sends the filters it keeps in the address bar', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/logs': () => json(200, listOf([])),
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
    })
    const { router } = renderApp('/admin/outlets/o1/logs?from=2026-10-01', testManager)

    expect(await screen.findByText('Tidak ada aksi yang cocok.')).toBeInTheDocument()
    await userEvent.selectOptions(await screen.findByLabelText('User'), testStaff.user_id)
    await screen.findByText('Tidak ada aksi yang cocok.')
    expect(router.state.location.search).toMatchObject({ user: testStaff.user_id, from: '2026-10-01' })

    const url = new URL(requests.filter((r) => r.url.includes('/logs')).at(-1)!.url)
    expect(url.searchParams.get('user_id')).toBe(testStaff.user_id)
    // Midnight in Jakarta.
    expect(url.searchParams.get('from')).toBe('2026-09-30T17:00:00.000Z')
  })

  it('shows an action it has no label for as recorded', async () => {
    serve({
      'GET /api/v1/outlets/o1/logs': () => json(200, listOf([entry({ action: 'menu.teleported', target_type: null, user: null, before: null, after: null })])),
      'GET /api/v1/outlets/o1/users': () => json(200, listOf([testStaff])),
    })
    renderApp('/admin/outlets/o1/logs', testManager)

    const row = (await screen.findByText('menu.teleported')).closest('tr')!
    expect(within(row).getByText('Tidak dikenal')).toBeInTheDocument()
  })

  it('is closed to whoever lacks log.view', async () => {
    serve({})
    const { router } = renderApp('/admin/outlets/o1/logs', testUser)

    await screen.findByRole('heading', { level: 1 })
    expect(router.state.location.pathname).not.toContain('logs')
  })
})

describe("the Owner's log", () => {
  it('filters by outlet, or by their own actions', async () => {
    const requests = serve({
      'GET /api/v1/owner/logs': () => json(200, listOf([entry({})])),
      'GET /api/v1/outlets': () => json(200, listOf([testOutlet])),
    })
    renderApp('/admin/logs', testOwner)

    await screen.findByText('Maki Bandung', { selector: 'td' })
    await userEvent.selectOptions(screen.getByLabelText('Outlet'), 'Aksi saya sendiri')
    await screen.findByText('Menu diubah')
    const url = new URL(requests.filter((r) => r.url.includes('/owner/logs')).at(-1)!.url)
    expect(url.searchParams.get('self')).toBe('true')
    expect(url.searchParams.get('outlet_ids')).toBeNull()
  })

  it('shows what the server refuses as an error, not an empty list', async () => {
    serve({
      'GET /api/v1/owner/logs': () => apiError(500, 'internal_error'),
      'GET /api/v1/outlets': () => json(200, listOf([testOutlet])),
    })
    renderApp('/admin/logs', testOwner)

    await screen.findByRole('heading', { name: 'Terjadi kesalahan' })
    expect(screen.queryByText('Tidak ada aksi yang cocok.')).not.toBeInTheDocument()
  })
})
