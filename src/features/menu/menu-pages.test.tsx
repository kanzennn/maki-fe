import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { components } from '@/shared/api/schema'
import { formatDateTime } from '@/shared/lib/time'
import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testCategories, testManager, testMenus, testOutlet, testOwner, testUser } from '@/test/fixtures'

type Category = components['schemas']['Category']

const [coffee, bolu, brownies] = testMenus
const storekeeper = { ...testUser, permissions: ['menu.view', 'stock.adjust'] }

const movements = [
  {
    stock_movement_id: 's2',
    type: 'out',
    qty_change: -3,
    stock_after: 2,
    reason: 'damaged',
    note: 'Basi',
    user: { user_id: 'g1', name: 'Gita' },
    order_id: null,
    created_at: '2026-09-30T03:05:00Z',
  },
  {
    stock_movement_id: 's1',
    type: 'initial',
    qty_change: 5,
    stock_after: 5,
    reason: 'initial',
    note: null,
    user: { user_id: 'm1', name: 'Rina' },
    order_id: null,
    created_at: '2026-09-29T01:00:00Z',
  },
]

/** The API behind a menu's page. */
function menuPage(extra: Parameters<typeof serve>[0] = {}) {
  return serve({
    'GET /api/v1/outlets/o1': () => json(200, testOutlet),
    'GET /api/v1/outlets/o1/menus/m-bolu': () => json(200, bolu),
    'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
    'GET /api/v1/outlets/o1/menus/m-bolu/stock-movements': () => json(200, listOf(movements)),
    'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
    ...extra,
  })
}

describe('the menu list', () => {
  it('shows each menu with its category, price and stock, in words as well as colour', async () => {
    serve({
      'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
    })
    renderApp('/admin/outlets/o1/menus', testManager)

    const main = within(await screen.findByRole('main'))
    const row = async (name: string) => (await main.findByRole('link', { name })).closest('tr')!
    expect(await row(coffee.name)).toHaveTextContent('Minuman · SKU KOPI-01')
    expect(await row(coffee.name)).toHaveTextContent('Rp 18.000')
    expect(await row(coffee.name)).toHaveTextContent('Tanpa stok')
    // Twice each: under the name on a phone, in its column from 640px.
    expect(within(await row(bolu.name)).getAllByText('Menipis')).toHaveLength(2)
    expect(within(await row(brownies.name)).getAllByText('Habis')).toHaveLength(2)
    expect(within(await row(brownies.name)).getByText('Nonaktif')).toBeInTheDocument()
    expect(main.getByRole('link', { name: 'Tambah menu' })).toHaveAttribute('href', '/admin/outlets/o1/menus/new')
    expect(main.getByRole('link', { name: 'Kategori' })).toHaveAttribute('href', '/admin/outlets/o1/menus/categories')
  })

  it("shows the Owner an outlet's menus under its tabs, without changing them", async () => {
    serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
    })
    renderApp('/admin/outlets/o1/menus', testOwner)

    expect(await screen.findByRole('heading', { level: 2, name: 'Menu' })).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Bagian outlet' })
    expect(within(tabs).getByRole('link', { name: 'Menu' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: bolu.name })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tambah menu' })).not.toBeInTheDocument()
  })

  it('filters by stock, from the first page again', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
    })
    const { router } = renderApp('/admin/outlets/o1/menus?page=2', testManager)
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Kondisi stok'), 'Menipis')

    await waitFor(() => expect(router.state.location.search).toEqual({ stock: 'low' }))
    expect(requests.some((r) => new URL(r.url).searchParams.get('stock') === 'low')).toBe(true)
  })
})

describe('a new menu', () => {
  it('takes the price with thousands separators, and a tracked menu from its starting count', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
      'POST /api/v1/outlets/o1/menus': () => json(201, bolu),
      'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
    })
    const { router } = renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Nama menu'), 'Bolu Pandan')
    await user.selectOptions(screen.getByLabelText('Kategori'), '🍰 Kue')
    const price = screen.getByLabelText('Harga')
    await user.type(price, '25000')
    expect(price).toHaveValue('25.000')
    await user.click(screen.getByLabelText('Stok terlacak'))
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))
    expect(await screen.findByLabelText('Stok awal')).toHaveAccessibleDescription(/^Wajib diisi\./)

    await user.type(screen.getByLabelText('Stok awal'), '10')
    await user.type(screen.getByLabelText('Ambang stok menipis'), '3')
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/outlets/o1/menus'))
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/menus')).toEqual({
      name: 'Bolu Pandan',
      category_id: 'c-cakes',
      price: 25000,
      description: null,
      sku: null,
      track_stock: true,
      initial_stock: 10,
      stock_alert: 3,
      is_active: true,
    })
  })

  it('shows a taken SKU on its field', async () => {
    serve({
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
      'POST /api/v1/outlets/o1/menus': () => apiError(409, 'menu_sku_taken'),
    })
    renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Nama menu'), 'Es Kopi')
    await user.selectOptions(screen.getByLabelText('Kategori'), '🧋 Minuman')
    await user.type(screen.getByLabelText('Harga'), '18000')
    await user.type(screen.getByLabelText('SKU'), 'KOPI-01')
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))

    await waitFor(() =>
      expect(screen.getByLabelText('SKU')).toHaveAccessibleDescription(/^SKU ini sudah dipakai menu lain di outlet ini\./),
    )
  })

  it('asks for a category first when the outlet has none', async () => {
    serve({ 'GET /api/v1/outlets/o1/categories': () => json(200, listOf([])) })
    renderApp('/admin/outlets/o1/menus/new', testManager)

    expect(
      await screen.findByText('Setiap menu masuk satu kategori, dan outlet ini belum punya kategori.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buat kategori' })).toHaveAttribute('href', '/admin/outlets/o1/menus/categories')
    expect(screen.queryByLabelText('Nama menu')).not.toBeInTheDocument()
  })
})

describe("a menu's stock", () => {
  it('adjusts it, never below what there is, and shows the count it will leave', async () => {
    const requests = menuPage({
      'POST /api/v1/outlets/o1/menus/m-bolu/stock-adjustments': () =>
        json(200, { ...bolu, stock_qty: 0, stock_status: 'out' }),
    })
    renderApp('/admin/outlets/o1/menus/m-bolu', testManager)
    const user = userEvent.setup()

    const adjust = await screen.findByRole('button', { name: 'Sesuaikan stok' })
    // Whoever manages the menu sets the alert in its form. (Asked before the
    // dialog opens: a modal hides the page behind it from queries by role.)
    expect(screen.queryByRole('button', { name: 'Ubah ambang' })).not.toBeInTheDocument()
    await user.click(adjust)
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Stok sekarang 2.')).toBeInTheDocument()
    await user.click(dialog.getByLabelText('Kurang'))
    expect(dialog.getByLabelText('Alasan')).toHaveValue('damaged')
    const qty = dialog.getByLabelText('Jumlah yang dikurangi')
    await user.type(qty, '3')
    await user.click(dialog.getByRole('button', { name: 'Simpan penyesuaian' }))
    expect(qty).toHaveAccessibleDescription('Lebih dari stok yang ada.')

    await user.clear(qty)
    await user.type(qty, '2')
    expect(dialog.getByText('Stok sesudahnya: 0')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Simpan penyesuaian' }))

    expect(await screen.findByText('Stok Bolu Pandan sekarang 0.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/menus/m-bolu/stock-adjustments')).toEqual({
      type: 'out',
      qty: 2,
      reason: 'damaged',
      note: null,
    })
  })

  it("says what there is when the count changed meanwhile, and asks for a note for Other", async () => {
    menuPage({
      'POST /api/v1/outlets/o1/menus/m-bolu/stock-adjustments': () =>
        apiError(409, 'stock_insufficient', { available: 1 }),
    })
    renderApp('/admin/outlets/o1/menus/m-bolu', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Sesuaikan stok' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByLabelText('Set jumlah'))
    await user.type(dialog.getByLabelText('Jumlah hasil hitung'), '1')
    await user.selectOptions(dialog.getByLabelText('Alasan'), 'Lainnya')
    await user.click(dialog.getByRole('button', { name: 'Simpan penyesuaian' }))
    expect(dialog.getByLabelText('Catatan')).toHaveAccessibleDescription(/^Wajib diisi\./)

    await user.click(dialog.getByLabelText('Kurang'))
    expect(dialog.getByLabelText('Alasan')).toHaveValue('other')
    await user.type(dialog.getByLabelText('Catatan'), 'Dipakai acara')
    await user.click(dialog.getByRole('button', { name: 'Simpan penyesuaian' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('Stok tidak cukup: tersisa 1.')
  })

  it('lets a storekeeper count stock and set the alert, without the menu form', async () => {
    const requests = menuPage({
      'PUT /api/v1/outlets/o1/menus/m-bolu/stock-alert': () => json(200, { ...bolu, stock_alert: 5 }),
    })
    renderApp('/admin/outlets/o1/menus/m-bolu', storekeeper)
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Sesuaikan stok' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simpan perubahan' })).not.toBeInTheDocument()
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument()
    expect(screen.getByText('Tampil Menipis di 3 atau kurang.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ubah ambang' }))
    const field = within(screen.getByRole('dialog')).getByLabelText('Ambang stok menipis')
    expect(field).toHaveValue('3')
    await user.clear(field)
    await user.type(field, '5')
    await user.click(screen.getByRole('button', { name: 'Simpan ambang' }))

    expect(await screen.findByText('Ambang stok Bolu Pandan disimpan.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/menus/m-bolu/stock-alert')).toEqual({ stock_alert: 5 })
  })

  it('shows the Owner the stock and its history, and nothing to change', async () => {
    menuPage()
    renderApp('/admin/outlets/o1/menus/m-bolu', testOwner)

    expect(await screen.findByRole('heading', { level: 2, name: 'Bolu Pandan' })).toBeInTheDocument()
    for (const name of ['Sesuaikan stok', 'Ubah ambang', 'Simpan perubahan', 'Nonaktifkan', 'Hapus menu']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    // The history, newest first, in the outlet's time zone.
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent(formatDateTime(movements[0].created_at, 'id', 'Asia/Jakarta'))
    expect(rows[0]).toHaveTextContent('oleh Gita')
    expect(rows[0]).toHaveTextContent('Kurang · Rusak/basi')
    expect(rows[0]).toHaveTextContent('Basi')
    expect(rows[0]).toHaveTextContent('-3')
    expect(rows[1]).toHaveTextContent('Stok awal')
    expect(rows[1]).toHaveTextContent('+5')
  })

  it('asks for the starting count when tracking is turned on, and says what turning it off keeps', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/menus/m-coffee': () => json(200, coffee),
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
      'GET /api/v1/outlets/o1/menus/m-coffee/stock-movements': () => json(200, listOf([])),
      'PUT /api/v1/outlets/o1/menus/m-coffee': () => json(200, { ...coffee, track_stock: true, stock_qty: 12 }),
      'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
    })
    renderApp('/admin/outlets/o1/menus/m-coffee', testManager)
    const user = userEvent.setup()

    expect(await screen.findByText('Stok menu ini tidak dilacak: selalu tersedia di kasir.')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Stok terlacak'))
    await user.type(screen.getByLabelText('Stok awal'), '12')
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    expect(await screen.findByText('Perubahan disimpan.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/menus/m-coffee')).toMatchObject({
      track_stock: true,
      initial_stock: 12,
      is_active: null,
    })
  })
})

describe('the categories', () => {
  it('moves a category a step at a time, says so, and keeps the focus on it', async () => {
    let order: Category[] = testCategories
    const requests = serve({
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(order)),
      'PUT /api/v1/outlets/o1/categories/order': async (request) => {
        const { category_ids: ids } = (await request.json()) as { category_ids: string[] }
        order = ids.map((id, index) => ({ ...testCategories.find((c) => c.category_id === id)!, sort_order: index }))
        return new Response(null, { status: 204 })
      },
    })
    renderApp('/admin/outlets/o1/menus/categories', testManager)
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Naikkan Minuman' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Naikkan Kue' }))

    expect(await screen.findByText('Kue sekarang di urutan 1.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/categories/order')).toEqual({
      category_ids: ['c-cakes', 'c-drinks'],
    })
    const items = within(within(screen.getByRole('main')).getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/^(Kue|Minuman)$/).textContent)).toEqual(['Kue', 'Minuman'])
    // At the top it can't go up any more: focus moves to its other button.
    expect(screen.getByRole('button', { name: 'Turunkan Kue' })).toHaveFocus()
  })

  it('creates a category with an emoji picked or typed, and refuses one that is no emoji', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf([])),
      'POST /api/v1/outlets/o1/categories': () => json(201, testCategories[0]),
    })
    renderApp('/admin/outlets/o1/menus/categories', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tambah kategori' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Nama kategori'), 'Minuman')
    await user.type(dialog.getByLabelText('Emoji lain'), '??')
    await user.click(dialog.getByRole('button', { name: 'Simpan kategori' }))
    expect(dialog.getByLabelText('Emoji lain')).toHaveAccessibleDescription(/^Formatnya belum sesuai\./)

    await user.click(dialog.getByLabelText('🧋'))
    expect(dialog.getByLabelText('Emoji lain')).toHaveValue('')
    await user.click(dialog.getByRole('button', { name: 'Simpan kategori' }))

    expect(await screen.findByText('Kategori Minuman dibuat.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/categories')).toEqual({ name: 'Minuman', icon: '🧋' })
  })

  it('says how many menus a category still holds instead of deleting it', async () => {
    serve({ 'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)) })
    renderApp('/admin/outlets/o1/menus/categories', testManager)
    const user = userEvent.setup()

    const cakes = (await screen.findByText('Kue')).closest('li')!
    await user.click(within(cakes).getByRole('button', { name: 'Hapus' }))

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Kategori ini masih berisi 2 menu.')
    expect(within(dialog).queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('shows the Owner the order without a way to change it', async () => {
    serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
    })
    renderApp('/admin/outlets/o1/menus/categories', testOwner)

    expect(await screen.findByText('Kue')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Naikkan Kue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tambah kategori' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })
})
