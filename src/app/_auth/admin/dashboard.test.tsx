import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testOutlet, testOwner } from '@/test/fixtures'

const dashboard = (overrides: Record<string, unknown> = {}) => ({
  from: '2026-10-01',
  to: '2026-10-01',
  previous_from: '2026-09-30',
  previous_to: '2026-09-30',
  summary: {
    sales: 39000,
    transactions: 3,
    average_transaction: 13000,
    items_sold: 4,
    void_count: 1,
    void_total: 3000,
    previous_sales: 26000,
    previous_transactions: 0,
  },
  days: [{ date: '2026-10-01', sales: 39000, transactions: 3 }],
  hours: [],
  outlets: [],
  payment_methods: [{ method: 'cash', amount: 39000, transactions: 3 }],
  top_menus: [{ menu_id: 'm1', outlet_id: 'o1', name: 'Kopi', qty: 2, sales: 10000 }],
  low_stock: [{ menu_id: 'm2', outlet_id: 'o1', outlet_name: 'Maki Bandung', name: 'Roti', stock_qty: 0, stock_alert: 3, stock_status: 'out' }],
  cashiers: [],
  tables: [],
  ...overrides,
})

describe("the Owner's dashboard", () => {
  it('shows the cards, the ranking, and what is short of stock', async () => {
    serve({
      'GET /api/v1/owner/dashboard': () =>
        json(200, dashboard({
          outlets: [{ outlet_id: 'o1', code: 'BDG01', name: 'Maki Bandung', sales: 30000, transactions: 2, previous_sales: 15000, previous_transactions: 2 }],
        })),
      'GET /api/v1/outlets': () => json(200, listOf([testOutlet])),
    })
    renderApp('/admin?from=2026-10-01&to=2026-10-01', testOwner)

    expect(await screen.findByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument()
    expect(screen.getAllByText(/39\.000/).length).toBeGreaterThan(0)
    // 39,000 from 26,000 is up by half; no transactions before, nothing to compare.
    expect(screen.getByText('Naik 50% dari periode sebelumnya')).toBeInTheDocument()
    expect(screen.getByText('Belum ada pembanding')).toBeInTheDocument()

    const ranking = screen.getByRole('region', { name: 'Ranking outlet' })
    expect(within(ranking).getByRole('link', { name: 'Maki Bandung' })).toHaveAttribute('href', '/admin/outlets/o1/dashboard')
    const stock = screen.getByRole('region', { name: 'Stok menipis dan habis' })
    expect(within(stock).getByText('Roti')).toBeInTheDocument()
    expect(within(stock).getByText('Habis')).toBeInTheDocument()
  })

  it('keeps the period and the outlets in the address bar, and asks for them', async () => {
    const requests = serve({
      'GET /api/v1/owner/dashboard': () => json(200, dashboard()),
      'GET /api/v1/outlets': () => json(200, listOf([testOutlet])),
    })
    const { router } = renderApp('/admin?from=2026-10-01&to=2026-10-01', testOwner)

    await userEvent.click(await screen.findByRole('button', { name: 'Maki Bandung' }))
    await screen.findByRole('button', { name: 'Maki Bandung', pressed: true })
    expect(router.state.location.search).toMatchObject({ from: '2026-10-01', outlets: [testOutlet.outlet_id] })
    const url = new URL(requests.filter((r) => r.url.includes('/owner/dashboard')).at(-1)!.url)
    expect(url.searchParams.get('outlet_ids')).toBe(testOutlet.outlet_id)
    expect(url.searchParams.get('from')).toBe('2026-10-01')
  })
})

describe("an outlet's dashboard", () => {
  it('asks for its own, with its cashiers and seated tables', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/dashboard': () =>
        json(200, dashboard({
          hours: Array.from({ length: 24 }, (_, hour) => ({ hour, sales: 0, transactions: 0 })),
          cashiers: [{ user_id: 'k1', name: 'Budi', sales: 30000, transactions: 2 }],
          tables: [{ table_id: 't1', name: 'A1', area_name: 'Indoor', orders: 1 }],
        })),
    })
    renderApp('/admin', testManager)

    const cashiers = await screen.findByRole('region', { name: 'Penjualan per kasir' })
    expect(within(cashiers).getByText('Budi')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Meja terisi' })).getByText('A1')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Ranking outlet' })).not.toBeInTheDocument()
    // Today in the outlet's time zone, both ends.
    const url = new URL(requests.find((r) => r.url.includes('/dashboard'))!.url)
    expect(url.searchParams.get('from')).toBe(url.searchParams.get('to'))
  })
})
