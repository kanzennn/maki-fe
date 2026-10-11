import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queryKeys } from '@/shared/api/query-keys'
import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testUser } from '@/test/fixtures'

import type {
  CreateOrderRequest,
  Order,
  OrderSummary,
  PosCatalog,
  PosDevice,
  PosFloor,
  PosMenu,
  PosVoucher,
} from './api'
import { useCart } from './cart'
import { resendDelays } from './checkout'
import { outletDay } from './receipt-number'
import { computeTotals } from './totals'
import { voucherDiscount } from './voucher'

const today = outletDay(new Date(), 'Asia/Jakarta')
const day = today.replaceAll('-', '')

const device: PosDevice = {
  device: { device_id: 'd1', code: 'K01', name: 'Kasir depan', platform: 'web' },
  order_no_prefix: 'BDG01-K01',
  day: today,
  next_number: 1,
}

const menu = (over: Partial<PosMenu> & Pick<PosMenu, 'menu_id' | 'name'>): PosMenu => ({
  category_id: 'c-drinks',
  description: null,
  sku: null,
  price: 18000,
  image_url: null,
  track_stock: false,
  stock_qty: null,
  stock_alert: null,
  stock_status: 'untracked',
  ...over,
})

const kopi = menu({ menu_id: 'm-kopi', name: 'Es Kopi Susu' })
const bolu = menu({
  menu_id: 'm-bolu',
  name: 'Bolu Pandan',
  category_id: 'c-cakes',
  price: 25000,
  track_stock: true,
  stock_qty: 2,
  stock_alert: 3,
  stock_status: 'low',
})
const jus = menu({ menu_id: 'm-jus', name: 'Jus Jeruk', price: 15000, track_stock: true, stock_qty: 10, stock_status: 'ok' })
const brownies = menu({
  menu_id: 'm-brownies',
  name: 'Brownies',
  category_id: 'c-cakes',
  price: 20000,
  track_stock: true,
  stock_qty: 0,
  stock_status: 'out',
})

/** The cashier's catalog: tax 10%, service 5%, as the shared vector's case. */
const catalog = (over: Partial<PosCatalog> = {}): PosCatalog => ({
  outlet: {
    outlet_id: 'o1',
    code: 'BDG01',
    name: 'Maki Bandung',
    address: 'Jl. Braga 1',
    phone: '022-123',
    timezone: 'Asia/Jakarta',
    locale: 'id',
    tax_bps: 1000,
    service_bps: 500,
  },
  payment_methods: ['cash'],
  dine_in_mode: 'table',
  categories: [
    { category_id: 'c-drinks', name: 'Minuman', icon: null, item_count: 2 },
    { category_id: 'c-cakes', name: 'Kue', icon: null, item_count: 2 },
  ],
  menus: [kopi, bolu, jus, brownies],
  ...over,
})

/** A voucher of the Owner's: 12,5% off, at most Rp 20.000, from Rp 50.000 spent. */
const merdeka: PosVoucher = {
  voucher_id: 'v1',
  code: 'MERDEKA17',
  name: 'Diskon Merdeka',
  type: 'percent',
  value: 1250,
  max_discount: 20000,
  min_spend: 50000,
}

/** POST …/vouchers/validate's answer for the voucher, on the subtotal sent. */
const checked = (terms: PosVoucher) => async (request: Request) => {
  const { subtotal } = (await request.json()) as { subtotal: number }
  return json(200, { voucher: terms, ...voucherDiscount(terms, subtotal) })
}

/** The tables the cashier's tests seat orders at, by ID. */
const tableNames = new Map([
  ['t-a1', 'A1'],
  ['t-a2', 'A2'],
])

/** The order the server takes for a request, as it would answer it; one naming a voucher takes merdeka. */
function taken(body: CreateOrderRequest, from = catalog()): Order {
  const names = new Map(from.menus.map((m) => [m.menu_id, m.name]))
  const subtotal = body.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discount = body.voucher_code ? voucherDiscount(merdeka, subtotal).discount : 0
  const totals = computeTotals(body.items, discount, from.outlet.service_bps, from.outlet.tax_bps)
  const received = body.payment.received ?? totals.total
  return {
    order_id: body.order_id,
    order_no: body.order_no,
    device_id: 'd1',
    type: body.type,
    table_id: body.table_id ?? null,
    table_name: body.table_id ? (tableNames.get(body.table_id) ?? null) : null,
    stand_number: body.stand_number ?? null,
    status: 'paid',
    cashier: { user_id: 'u1', name: 'Budi' },
    items: body.items.map((item, i) => ({
      order_item_id: `i${i}`,
      menu_id: item.menu_id,
      menu_name: names.get(item.menu_id) ?? '',
      price: item.price,
      qty: item.qty,
      note: item.note ?? null,
      line_total: item.price * item.qty,
    })),
    subtotal: totals.subtotal,
    voucher_code: body.voucher_code ? merdeka.code : null,
    voucher_discount: totals.discount,
    service_bps: from.outlet.service_bps,
    service: totals.service,
    tax_bps: from.outlet.tax_bps,
    tax: totals.tax,
    total: totals.total,
    payment: { method: 'cash', amount: totals.total, received, change: received - totals.total, status: 'paid' },
    client_created_at: body.client_created_at,
    created_at: body.client_created_at,
    voided_at: null,
    voided_by: null,
    void_reason: null,
  }
}

/** The API behind the sell screen, with POST /orders answered by orders. */
function cashier(orders: (body: CreateOrderRequest, call: number) => Response | Promise<Response>, extra = {}) {
  let call = 0
  return serve({
    'GET /api/v1/outlets/o1/pos/device': () => json(200, device),
    'GET /api/v1/outlets/o1/pos/catalog': () => json(200, catalog()),
    'POST /api/v1/outlets/o1/orders': async (request) => orders((await request.json()) as CreateOrderRequest, call++),
    'GET /api/v1/outlets/o1/orders': () => json(200, listOf([])),
    ...extra,
  })
}

const card = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

/** An accessible name with money in it: Intl puts a no-break space after Rp. */
const exactly = (text: string) => {
  const backslash = String.fromCharCode(92)
  const escaped = [...text].map((c) => ('.()+?^$|[]{}*'.includes(c) ? backslash + c : c)).join('')
  return new RegExp(`^${escaped.split(' ').join(`${backslash}s`)}$`)
}

/** Window.print, which jsdom lacks: what it printed, then the end of printing. */
function mockPrint() {
  const printed: string[] = []
  vi.spyOn(window, 'print').mockImplementation(() => {
    printed.push(document.querySelector('.print-receipt')?.textContent ?? '')
    window.dispatchEvent(new Event('afterprint'))
  })
  return printed
}
const panel = () => within(screen.getByRole('region', { name: 'Detail Items' }))

beforeEach(() => {
  useCart.setState({ owner: null })
  useCart.getState().clear()
})

describe('a device that can’t sell', () => {
  it('tells a cashier who can activate it', async () => {
    serve({
      'GET /api/v1/outlets/o1/pos/device': () => apiError(403, 'device_not_registered'),
      'GET /api/v1/outlets/o1/pos/catalog': () => json(200, catalog()),
    })
    renderApp('/pos', testUser)

    expect(await screen.findByRole('heading', { level: 1, name: 'Perangkat ini belum terdaftar' })).toBeInTheDocument()
    expect(screen.getByText(/Minta Manager masuk di perangkat ini/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aktifkan perangkat ini' })).not.toBeInTheDocument()
  })

  it('lets the Manager activate it, which opens the cashier', async () => {
    let activated = false
    const requests = serve({
      'GET /api/v1/outlets/o1/pos/device': () =>
        activated ? json(200, device) : apiError(403, 'device_revoked'),
      'GET /api/v1/outlets/o1/pos/catalog': () => json(200, catalog()),
      'POST /api/v1/outlets/o1/devices': () => {
        activated = true
        return json(201, { device: {}, token: null })
      },
    })
    renderApp('/pos', testManager)

    expect(await screen.findByRole('heading', { level: 1, name: 'Perangkat ini sudah dicabut' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan perangkat ini' }))
    expect(screen.getByText('Wajib diisi.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nama perangkat'), '  Kasir depan ')
    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan perangkat ini' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })).toBeInTheDocument()
    expect(screen.getByText('K01 · Kasir depan')).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/devices')).toEqual({ name: 'Kasir depan', platform: 'web' })
  })
})

describe('the sell screen', () => {
  it("shows the menus in the catalog's order: low stock marked, sold out not to be picked", async () => {
    cashier(() => json(500))
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    const order = screen
      .getAllByRole('button')
      .flatMap((button) => [kopi, bolu, jus, brownies].filter((m) => button.textContent?.includes(m.name)))
      .map((m) => m.name)
    expect(order).toEqual(['Es Kopi Susu', 'Bolu Pandan', 'Jus Jeruk', 'Brownies'])
    expect(card('Bolu Pandan')).toHaveTextContent('Tersedia 2')
    expect(card('Bolu Pandan')).toHaveTextContent('Stok menipis')
    expect(card('Brownies')).toBeDisabled()
    expect(card('Brownies')).toHaveTextContent('Habis')
    expect(card('Es Kopi Susu')).toHaveTextContent('Selalu tersedia')

    // A category, then the search, keep that order.
    await userEvent.click(screen.getByRole('button', { name: /^Kue/ }))
    expect(screen.queryByRole('button', { name: /^Es Kopi Susu/ })).not.toBeInTheDocument()
    expect(card('Brownies')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Semua menu/ }))
    await userEvent.type(screen.getByLabelText('Cari menu'), 'jus')
    expect(card('Jus Jeruk')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Brownies/ })).not.toBeInTheDocument()
  })

  it('builds the order up to the stock, with notes, and sums it by the shared rule', async () => {
    cashier(() => json(500))
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.click(card('Bolu Pandan'))
    await userEvent.click(panel().getByRole('button', { name: 'Tambah Bolu Pandan' }))
    // Two left: no more of it.
    expect(panel().getByRole('button', { name: 'Tambah Bolu Pandan' })).toBeDisabled()
    expect(panel().getByText('Sisa stok 2')).toBeInTheDocument()
    expect(card('Bolu Pandan')).toBeDisabled()

    // 2 × 18,000 + 2 × 25,000 = 86,000; service 5% = 4,300; tax 10% of
    // 90,300 = 9,030; total 99,330.
    const summary = panel()
    expect(summary.getByText('Rp 86.000')).toBeInTheDocument()
    expect(summary.getByText('Service (5%)').nextSibling).toHaveTextContent('Rp 4.300')
    expect(summary.getByText('Pajak (10%)').nextSibling).toHaveTextContent('Rp 9.030')
    expect(summary.getByRole('button', { name: exactly('Bayar Rp 99.330') })).toBeEnabled()

    await userEvent.click(panel().getAllByRole('button', { name: 'Catatan' })[0])
    await userEvent.type(panel().getByLabelText('Catatan untuk Es Kopi Susu'), 'less sugar')
    await userEvent.click(panel().getByRole('button', { name: 'Kurangi Bolu Pandan' }))
    await userEvent.click(panel().getByRole('button', { name: 'Hapus Bolu Pandan' }))
    expect(panel().queryByText('Bolu Pandan')).not.toBeInTheDocument()
    expect(useCart.getState().lines).toEqual([{ menuId: 'm-kopi', name: 'Es Kopi Susu', qty: 2, note: 'less sugar' }])
    // Cash only, for now.
    expect(panel().getByRole('radio', { name: 'Tunai' })).toBeChecked()
    expect(panel().getByRole('radio', { name: /QRIS/ })).toBeDisabled()
  })

  it("takes cash, gives the change, and prints the receipt in the outlet's language", async () => {
    const printed = mockPrint()
    const requests = serve({
      'GET /api/v1/outlets/o1/pos/device': () => json(200, device),
      'GET /api/v1/outlets/o1/pos/catalog': () =>
        json(200, catalog({ outlet: { ...catalog().outlet, locale: 'en' } })),
      'POST /api/v1/outlets/o1/orders': async (request) =>
        json(201, taken((await request.json()) as CreateOrderRequest)),
      'GET /api/v1/outlets/o1/orders': () => json(200, listOf([])),
    })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.click(panel().getByRole('radio', { name: 'Takeaway' }))
    // 18,000 + 900 service + 1,890 tax.
    await userEvent.click(panel().getByRole('button', { name: exactly('Bayar Rp 20.790') }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    expect(dialog.getByRole('button', { name: 'Bayar' })).toBeDisabled()
    expect(dialog.getByRole('button', { name: exactly('Rp 50.000') })).toBeEnabled()
    await userEvent.type(dialog.getByLabelText('Uang diterima'), '20000')
    expect(dialog.getByText('Kurang Rp 790')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Bayar' })).toBeDisabled()
    await userEvent.click(dialog.getByRole('button', { name: exactly('Rp 50.000') }))
    expect(dialog.getByText('Rp 29.210')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))

    const done = within(await screen.findByRole('dialog', { name: 'Transaksi tersimpan' }))
    expect(done.getByText('Kembalian Rp 29.210')).toBeInTheDocument()
    const receipt = within(done.getByRole('article', { name: `Receipt BDG01-K01-${day}-0001` }))
    expect(receipt.getByText('Thank you')).toBeInTheDocument()
    expect(receipt.getByText('Takeaway')).toBeInTheDocument()
    expect(receipt.getByText('Jl. Braga 1')).toBeInTheDocument()
    expect(receipt.getByText('Rp 20,790')).toBeInTheDocument()

    const body = (await bodyOf(requests, 'POST', '/api/v1/outlets/o1/orders')) as CreateOrderRequest
    expect(body).toEqual({
      order_id: body.order_id,
      order_no: `BDG01-K01-${day}-0001`,
      type: 'takeaway',
      client_created_at: body.client_created_at,
      items: [{ menu_id: 'm-kopi', qty: 1, price: 18000, note: null }],
      total: 20790,
      payment: { method: 'cash', received: 50000 },
    })
    expect(body.order_id).toMatch(/^[a-z][a-z0-9]{23}$/)

    await userEvent.click(done.getByRole('button', { name: 'Cetak struk' }))
    expect(printed).toHaveLength(1)
    expect(printed[0]).toContain(`BDG01-K01-${day}-0001`)
    expect(document.querySelector('.print-receipt')).toBeNull()
    await userEvent.click(done.getByRole('button', { name: 'Transaksi baru' }))
    expect(panel().getByText('Belum ada pesanan. Pilih menu untuk mulai.')).toBeInTheDocument()
  })

  describe('when the server doesn’t answer', () => {
    const delays = [...resendDelays]
    beforeEach(() => resendDelays.splice(0, resendDelays.length, 0, 0))
    afterEach(() => resendDelays.splice(0, resendDelays.length, ...delays))

    it('sends the same sale again, by itself and then on request, until it is taken', async () => {
      const sent: string[] = []
      // A server error first, which may come after the sale was saved, then
      // no answer at all.
      cashier((body, call) => {
        sent.push(JSON.stringify(body))
        if (call === 0) return apiError(500, 'internal_error')
        if (call < 3) throw new TypeError('Failed to fetch')
        return json(200, taken(body))
      })
      renderApp('/pos', testUser)
      await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
      await userEvent.click(card('Es Kopi Susu'))
      await userEvent.click(panel().getByRole('button', { name: /^Bayar/ }))
      const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Uang pas' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))

      expect(await dialog.findByText(/Server belum menjawab/)).toBeInTheDocument()
      expect(sent).toHaveLength(3)
      // The order can't change meanwhile.
      expect(useCart.getState().pending).not.toBeNull()
      await userEvent.click(dialog.getByRole('button', { name: 'Kirim ulang' }))

      expect(await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })).toBeInTheDocument()
      expect(sent).toHaveLength(4)
      expect(new Set(sent).size).toBe(1)
      expect(useCart.getState().pending).toBeNull()
    })
  })

  it('takes the next receipt number when another tab took this one, under the same ID', async () => {
    // The other tab's sale has moved the count on by the time the server
    // refuses this one.
    let moved = false
    const bodies: CreateOrderRequest[] = []
    cashier(
      (body, call) => {
        bodies.push(body)
        if (call > 0) return json(201, taken(body))
        moved = true
        return apiError(409, 'order_no_taken')
      },
      { 'GET /api/v1/outlets/o1/pos/device': () => json(200, { ...device, next_number: moved ? 5 : 1 }) },
    )
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.click(panel().getByRole('button', { name: /^Bayar/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Uang pas' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))

    expect(await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })).toBeInTheDocument()
    expect(bodies.map((b) => b.order_no)).toEqual([`BDG01-K01-${day}-0001`, `BDG01-K01-${day}-0005`])
    expect(bodies[1].order_id).toBe(bodies[0].order_id)
  })

  it('follows a price that changed, and says so before charging again', async () => {
    let catalogCalls = 0
    cashier(
      () => apiError(409, 'prices_changed', { menus: [{ menu_id: 'm-kopi', price: 20000 }] }),
      {
        'GET /api/v1/outlets/o1/pos/catalog': () =>
          json(200, catalog(catalogCalls++ === 0 ? {} : { menus: [{ ...kopi, price: 20000 }, bolu, jus, brownies] })),
      },
    )
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.click(panel().getByRole('button', { name: exactly('Bayar Rp 20.790') }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Uang pas' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Harga Es Kopi Susu berubah.')
    expect(alert).toHaveTextContent('Periksa pesanan dan totalnya, lalu tagih lagi.')
    expect(screen.queryByRole('dialog', { name: 'Bayar tunai' })).not.toBeInTheDocument()
    // 20,000 + 1,000 + 2,100.
    expect(await panel().findByRole('button', { name: exactly('Bayar Rp 23.100') })).toBeInTheDocument()
  })

  it('cuts a line to the stock left when it ran short, and says so', async () => {
    let catalogCalls = 0
    cashier(() => apiError(409, 'order_stock_insufficient', { menus: [{ menu_id: 'm-bolu', available: 1 }] }), {
      'GET /api/v1/outlets/o1/pos/catalog': () =>
        json(
          200,
          catalog(
            catalogCalls++ === 0 ? {} : { menus: [kopi, { ...bolu, stock_qty: 1 }, jus, brownies] },
          ),
        ),
    })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Bolu Pandan'))
    await userEvent.click(card('Bolu Pandan'))
    await userEvent.click(panel().getByRole('button', { name: /^Bayar/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    // 57,750: 50,000 doesn't cover it.
    expect(dialog.getByRole('button', { name: exactly('Rp 50.000') })).toBeDisabled()
    await userEvent.click(dialog.getByRole('button', { name: exactly('Rp 100.000') }))
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))

    expect(await screen.findByText('Stok Bolu Pandan tidak cukup lagi, jadi jumlahnya disesuaikan.')).toBeInTheDocument()
    expect(panel().getByText('1 × Rp 25.000')).toBeInTheDocument()
  })

  it('sends whoever only voids to today’s orders', async () => {
    serve({ 'GET /api/v1/outlets/o1/orders': () => json(200, listOf([])) })
    renderApp('/pos', { ...testUser, permissions: ['order.void'] })
    expect(await screen.findByRole('heading', { level: 1, name: 'Riwayat hari ini' })).toBeInTheDocument()
    expect(screen.getByText('Belum ada transaksi hari ini.')).toBeInTheDocument()
  })
})

describe('a voucher at the till', () => {
  const validate = 'POST /api/v1/outlets/o1/vouchers/validate'
  const voucherField = () => panel().getByLabelText('Voucher')

  async function apply(code: string) {
    await userEvent.type(voucherField(), code)
    await userEvent.click(panel().getByRole('button', { name: 'Pakai' }))
  }

  async function payExactly(total: string) {
    await userEvent.click(await panel().findByRole('button', { name: exactly(`Bayar ${total}`) }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Uang pas' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))
  }

  it('works its discount out as the cart changes, and sells with it', async () => {
    const requests = cashier((body) => json(201, taken(body)), { [validate]: checked(merdeka) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    for (let i = 0; i < 3; i++) await userEvent.click(card('Es Kopi Susu'))
    await apply(' merdeka17')

    expect(await panel().findByText('MERDEKA17')).toBeInTheDocument()
    expect(panel().getByText('Diskon Merdeka')).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/vouchers/validate')).toEqual({ code: 'merdeka17', subtotal: 54000 })
    // 54,000 - 12,5% (6,750) = 47,250; service 2,363; tax 4,961.
    expect(panel().getByText('Potongan (MERDEKA17)').nextSibling).toHaveTextContent('-Rp 6.750')
    expect(panel().getByRole('button', { name: exactly('Bayar Rp 54.574') })).toBeEnabled()
    // One more: 72,000 - 9,000, worked out here, without asking again.
    await userEvent.click(card('Es Kopi Susu'))
    expect(panel().getByText('Potongan (MERDEKA17)').nextSibling).toHaveTextContent('-Rp 9.000')
    expect(panel().getByRole('button', { name: exactly('Bayar Rp 72.765') })).toBeEnabled()
    await userEvent.click(panel().getByRole('button', { name: 'Kurangi Es Kopi Susu' }))

    await payExactly('Rp 54.574')
    const done = within(await screen.findByRole('dialog', { name: 'Transaksi tersimpan' }))
    const receipt = within(done.getByRole('article'))
    expect(receipt.getByText('Potongan (MERDEKA17)').nextSibling).toHaveTextContent('-Rp 6.750')

    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/orders')).toMatchObject({
      voucher_code: 'MERDEKA17',
      total: 54574,
      payment: { method: 'cash', received: 54574 },
    })
    expect(requests.filter((r) => r.url.endsWith('/vouchers/validate'))).toHaveLength(1)
    // The next customer starts without it.
    await userEvent.click(done.getByRole('button', { name: 'Transaksi baru' }))
    expect(voucherField()).toHaveValue('')
    expect(panel().queryByText('MERDEKA17')).not.toBeInTheDocument()
  })

  it("holds the payment while the cart is short of the voucher's minimum spend", async () => {
    cashier(() => json(500), { [validate]: checked(merdeka) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await apply('MERDEKA17')

    expect(await panel().findByRole('status')).toHaveTextContent('Belanja minimal Rp 50.000 untuk voucher ini.')
    expect(panel().queryByText('Potongan (MERDEKA17)')).not.toBeInTheDocument()
    expect(panel().getByRole('button', { name: exactly('Bayar Rp 20.790') })).toBeDisabled()
    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.click(card('Es Kopi Susu'))
    expect(panel().queryByRole('status')).not.toBeInTheDocument()
    expect(panel().getByRole('button', { name: exactly('Bayar Rp 54.574') })).toBeEnabled()
  })

  it('says why a code is refused, and keeps it to fix', async () => {
    cashier(() => json(500), { [validate]: () => apiError(409, 'voucher_expired') })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await apply('LEWAT')

    expect(await panel().findByRole('alert')).toHaveTextContent('Voucher ini sudah expired.')
    expect(voucherField()).toHaveValue('LEWAT')
    expect(voucherField()).toHaveAccessibleDescription('Voucher ini sudah expired.')
  })

  it('comes off when the sale refuses it, and the screen says why', async () => {
    cashier(() => apiError(409, 'voucher_used_up'), { [validate]: checked(merdeka) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    for (let i = 0; i < 3; i++) await userEvent.click(card('Es Kopi Susu'))
    await apply('MERDEKA17')
    await payExactly('Rp 54.574')

    expect(await screen.findByText('Voucher MERDEKA17 dilepas: Kuota voucher ini sudah habis.')).toBeInTheDocument()
    expect(useCart.getState().voucher).toBeNull()
    expect(panel().queryByText(/Potongan/)).not.toBeInTheDocument()
    // 54,000 + 2,700 + 5,670, without it.
    expect(panel().getByRole('button', { name: exactly('Bayar Rp 62.370') })).toBeEnabled()
  })

  it('checks its terms again when the total changed', async () => {
    let calls = 0
    const twenty = { ...merdeka, value: 2000 }
    cashier(() => apiError(409, 'total_changed', { total: 52164 }), {
      [validate]: (request: Request) => checked(calls++ === 0 ? merdeka : twenty)(request),
    })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    for (let i = 0; i < 3; i++) await userEvent.click(card('Es Kopi Susu'))
    await apply('MERDEKA17')
    await payExactly('Rp 54.574')

    expect(await screen.findByText('Pajak, service charge, atau syarat voucher berubah.')).toBeInTheDocument()
    // 20% now: 10,800 off.
    await waitFor(() => expect(panel().getByText('Potongan (MERDEKA17)').nextSibling).toHaveTextContent('-Rp 10.800'))
    expect(calls).toBe(2)
  })

  it('can be taken off by hand', async () => {
    cashier(() => json(500), { [validate]: checked(merdeka) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    for (let i = 0; i < 3; i++) await userEvent.click(card('Es Kopi Susu'))
    await apply('MERDEKA17')
    await userEvent.click(await panel().findByRole('button', { name: 'Lepas voucher MERDEKA17' }))
    expect(voucherField()).toBeInTheDocument()
    expect(panel().getByRole('button', { name: exactly('Bayar Rp 62.370') })).toBeEnabled()
  })
})

/** Maki Bandung's floor: Indoor with A1 free, A2 occupied and A3 off and not placed; Teras with T1 scheduled off. */
const floor: PosFloor = {
  areas: [
    {
      area_id: 'a-in',
      name: 'Indoor',
      decorations: [{ kind: 'wall', x: 0, y: 31, w: 48, h: 1, rotation: 0 }],
      tables: [
        {
          table_id: 't-a1',
          name: 'A1',
          capacity: 4,
          shape: 'square',
          box: { x: 2, y: 2, w: 3, h: 3 },
          rotation: 0,
          status: 'available',
          seated: null,
        },
        {
          table_id: 't-a2',
          name: 'A2',
          capacity: 2,
          shape: 'round',
          box: { x: 10, y: 2, w: 3, h: 3 },
          rotation: 0,
          status: 'occupied',
          seated: { since: '2026-10-05T05:30:00Z', orders: 2 },
        },
        { table_id: 't-a3', name: 'A3', capacity: null, shape: 'square', box: null, rotation: 0, status: 'inactive', seated: null },
      ],
    },
    {
      area_id: 'a-out',
      name: 'Teras',
      decorations: [],
      tables: [
        {
          table_id: 't-t1',
          name: 'T1',
          capacity: 6,
          shape: 'rectangle',
          box: { x: 0, y: 0, w: 5, h: 3 },
          rotation: 0,
          status: 'scheduled',
          seated: null,
        },
        {
          table_id: 't-t2',
          name: 'T2',
          capacity: 4,
          shape: 'square',
          box: { x: 10, y: 0, w: 3, h: 3 },
          rotation: 0,
          status: 'available',
          seated: null,
        },
      ],
    },
  ],
}

describe('tables at the till', () => {
  const floorPath = 'GET /api/v1/outlets/o1/pos/tables'
  const tableChoice = () => panel().queryByRole('button', { name: /^Pilih meja/ })
  const floorLoads = (requests: Request[]) => requests.filter((r) => new URL(r.url).pathname.endsWith('/pos/tables')).length

  async function pickTable(name: RegExp) {
    await userEvent.click(panel().getByRole('button', { name: /^Pilih meja/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Pilih meja' }))
    await userEvent.click(await dialog.findByRole('button', { name }))
  }

  async function payExactly(total: string) {
    await userEvent.click(await panel().findByRole('button', { name: exactly(`Bayar ${total}`) }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Uang pas' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))
  }

  it("seats a dine-in order at a table picked from the floor, and the receipt says which", async () => {
    const requests = cashier((body) => json(201, taken(body)), { [floorPath]: () => json(200, floor) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    await waitFor(() => expect(floorLoads(requests)).toBeGreaterThan(0))
    const opened = floorLoads(requests)
    await userEvent.click(panel().getByRole('button', { name: /^Pilih meja/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Pilih meja' }))
    await waitFor(() => expect(floorLoads(requests)).toBeGreaterThan(opened))
    // An occupied table takes an order more; one off doesn't.
    expect(await dialog.findByRole('button', { name: 'Meja A2, Terisi, 2 kursi' })).toBeEnabled()
    expect(dialog.getByRole('button', { name: 'Meja A3, Nonaktif' })).toBeDisabled()
    await userEvent.click(dialog.getByRole('button', { name: 'Teras' }))
    expect(dialog.getByRole('button', { name: 'Meja T1, Nonaktif terjadwal, 6 kursi' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(dialog.getByRole('button', { name: 'Indoor' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' }))

    expect(screen.queryByRole('dialog', { name: 'Pilih meja' })).not.toBeInTheDocument()
    expect(panel().getByText('Meja A1')).toBeInTheDocument()
    const sold = floorLoads(requests)
    await payExactly('Rp 20.790')

    const done = within(await screen.findByRole('dialog', { name: 'Transaksi tersimpan' }))
    const receipt = within(done.getByRole('article', { name: `Struk BDG01-K01-${day}-0001` }))
    expect(receipt.getByText('Meja')).toBeInTheDocument()
    expect(receipt.getByText('A1')).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/orders')).toMatchObject({ type: 'dine_in', table_id: 't-a1' })
    // Ready for the next customer, without a table; the floor loads again, with A1 taken.
    await userEvent.click(done.getByRole('button', { name: 'Transaksi baru' }))
    expect(tableChoice()).toBeInTheDocument()
    await waitFor(() => expect(floorLoads(requests)).toBeGreaterThan(sold))
  })

  it('lets the table go by hand, and with a takeaway', async () => {
    const requests = cashier((body) => json(201, taken(body)), { [floorPath]: () => json(200, floor) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    await pickTable(/^Meja A2,/)
    expect(panel().getByText('Meja A2')).toBeInTheDocument()
    await userEvent.click(panel().getByRole('button', { name: 'Lepas meja A2' }))
    expect(tableChoice()).toBeInTheDocument()

    await pickTable(/^Meja A1,/)
    await userEvent.click(panel().getByRole('button', { name: 'Ganti' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Pilih meja' })).getByRole('button', { name: /^Meja A2,/ }))
    expect(panel().getByText('Meja A2')).toBeInTheDocument()

    // Picked in Teras, it opens there again.
    await userEvent.click(panel().getByRole('button', { name: 'Ganti' }))
    let picker = within(await screen.findByRole('dialog', { name: 'Pilih meja' }))
    await userEvent.click(picker.getByRole('button', { name: 'Teras' }))
    await userEvent.click(picker.getByRole('button', { name: /^Meja T2,/ }))
    await userEvent.click(panel().getByRole('button', { name: 'Ganti' }))
    picker = within(await screen.findByRole('dialog', { name: 'Pilih meja' }))
    expect(picker.getByRole('button', { name: 'Teras' })).toHaveAttribute('aria-pressed', 'true')
    expect(picker.getByRole('button', { name: /^Meja T2,/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{Escape}')

    // A takeaway has no table, and keeps none for when it's dine-in again.
    await userEvent.click(panel().getByRole('radio', { name: 'Takeaway' }))
    expect(tableChoice()).not.toBeInTheDocument()
    expect(panel().queryByText('Meja T2')).not.toBeInTheDocument()
    await userEvent.click(panel().getByRole('radio', { name: 'Dine-in' }))
    expect(tableChoice()).toBeInTheDocument()
    await userEvent.click(panel().getByRole('radio', { name: 'Takeaway' }))
    await payExactly('Rp 20.790')
    await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })
    const body = (await bodyOf(requests, 'POST', '/api/v1/outlets/o1/orders')) as CreateOrderRequest
    expect(body.type).toBe('takeaway')
    expect('table_id' in body).toBe(false)
  })

  it('takes the table off when the sale refuses it, and says why', async () => {
    let refused = false
    const requests = cashier(
      () => {
        refused = true
        return apiError(409, 'table_unavailable', { status: 'scheduled' })
      },
      { [floorPath]: () => json(200, floor) },
    )
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    await pickTable(/^Meja A1,/)
    const before = floorLoads(requests)
    await payExactly('Rp 20.790')

    expect(await screen.findByRole('alert')).toHaveTextContent('Meja A1 dilepas dari pesanan: mejanya sedang nonaktif terjadwal.')
    expect(refused).toBe(true)
    expect(tableChoice()).toBeInTheDocument()
    await waitFor(() => expect(floorLoads(requests)).toBeGreaterThan(before))
  })

  it('says why in the server’s words when it gives no status', async () => {
    cashier(() => apiError(409, 'table_unavailable'), { [floorPath]: () => json(200, floor) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    await pickTable(/^Meja A1,/)
    await payExactly('Rp 20.790')

    expect(await screen.findByRole('alert')).toHaveTextContent('Meja A1 dilepas dari pesanan: Meja ini sedang tidak bisa dipilih.')
  })

  it("offers no table where the outlet has none, and no Tables page", async () => {
    cashier((body) => json(201, taken(body)), { [floorPath]: () => json(200, { areas: [] }) })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    expect(tableChoice()).not.toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Menu kasir' })[0]
    expect(within(nav).queryByRole('link', { name: 'Meja' })).not.toBeInTheDocument()
  })

  it('shows the floor with its statuses, a table’s detail, and releases one after asking', async () => {
    let released = false
    const requests = cashier((body) => json(201, taken(body)), {
      [floorPath]: () =>
        json(200, released ? { areas: [{ ...floor.areas[0], tables: [floor.areas[0].tables[0], { ...floor.areas[0].tables[1], status: 'available', seated: null }, floor.areas[0].tables[2]] }, floor.areas[1]] } : floor),
      'POST /api/v1/outlets/o1/tables/t-a2/release': () => {
        released = true
        return json(200, { ...floor.areas[0].tables[1], status: 'available', seated: null })
      },
    })
    renderApp('/pos/tables', testUser)

    expect(await screen.findByRole('heading', { level: 1, name: 'Meja' })).toBeInTheDocument()
    expect(screen.getByText(/^Pilih meja untuk melihat statusnya/)).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Menu kasir' })[0]
    expect(within(nav).getByRole('link', { name: 'Meja' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Indoor' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Keterangan:')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Meja A2, Terisi, 2 kursi' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Meja A2' }))
    expect(dialog.getByText('Indoor')).toBeInTheDocument()
    expect(dialog.getByText('12.30')).toBeInTheDocument()
    expect(dialog.getByText('2')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Kosongkan Meja' }))
    const ask = within(screen.getByRole('alertdialog', { name: 'Kosongkan meja A2?' }))
    await userEvent.click(ask.getByRole('button', { name: 'Kosongkan Meja' }))

    expect(await screen.findByText('Meja A2 dikosongkan.')).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'POST' && new URL(r.url).pathname.endsWith('/tables/t-a2/release'))).toBe(true)
    expect(await screen.findByRole('button', { name: 'Meja A2, Tersedia, 2 kursi' })).toBeInTheDocument()
  })

  it('orders at a table from its detail, and explains one that can’t be picked', async () => {
    cashier((body) => json(201, taken(body)), { [floorPath]: () => json(200, floor) })
    // The cashier's own cart, a takeaway so far.
    useCart.setState({ owner: testUser.user_id, type: 'takeaway' })
    const { router } = renderApp('/pos/tables', testUser)

    await userEvent.click(await screen.findByRole('button', { name: 'Meja A3, Nonaktif' }))
    let dialog = within(await screen.findByRole('dialog', { name: 'Meja A3' }))
    expect(dialog.getByText(/^Meja ini sedang dinonaktifkan Manager/)).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'Pesan di meja ini' })).not.toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'Kosongkan Meja' })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' }))
    dialog = within(await screen.findByRole('dialog', { name: 'Meja A1' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Pesan di meja ini' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/pos'))
    expect(await panel().findByText('Meja A1')).toBeInTheDocument()
    expect(panel().getByRole('radio', { name: 'Dine-in' })).toBeChecked()
  })

  it("won't order at a table while the last sale has no answer", async () => {
    cashier((body) => json(201, taken(body)), { [floorPath]: () => json(200, floor) })
    useCart.setState({ owner: testUser.user_id })
    useCart.getState().setPending({
      order_id: 'a1',
      order_no: `BDG01-K01-${day}-0001`,
      type: 'dine_in',
      client_created_at: new Date().toISOString(),
      items: [],
      total: 0,
      payment: { method: 'cash', received: 0 },
    })
    renderApp('/pos/tables', testUser)

    await userEvent.click(await screen.findByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Meja A1' }))
    expect(dialog.getByRole('button', { name: 'Pesan di meja ini' })).toBeDisabled()
    expect(dialog.getByText(/^Transaksi sebelumnya belum terjawab/)).toBeInTheDocument()
  })

  it('pans and zooms the floor on a phone', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    cashier((body) => json(201, taken(body)), { [floorPath]: () => json(200, floor) })
    renderApp('/pos/tables', testUser)

    const zoomIn = await screen.findByRole('button', { name: 'Perbesar layout' })
    const zoomOut = screen.getByRole('button', { name: 'Perkecil layout' })
    const box = screen.getByRole('group', { name: 'Layout area Indoor' }).closest('[data-scale]')!
    expect(box).toHaveAttribute('data-scale', '1')
    expect(zoomOut).toBeDisabled()
    await userEvent.click(zoomIn)
    expect(box).toHaveAttribute('data-scale', '1.5')
    await userEvent.click(zoomOut)
    expect(box).toHaveAttribute('data-scale', '1')
    // A drag pans, and isn't a tap on the table it started on.
    const a1 = screen.getByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' })
    fireEvent.pointerDown(a1, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(a1, { pointerId: 1, clientX: 160, clientY: 100 })
    fireEvent.pointerUp(a1, { pointerId: 1, clientX: 160, clientY: 100 })
    // The click a browser sends right after, on the same element.
    fireEvent.click(a1)
    expect(screen.queryByRole('dialog', { name: 'Meja A1' })).not.toBeInTheDocument()
    // Still a button to tap.
    await userEvent.click(a1)
    expect(await screen.findByRole('dialog', { name: 'Meja A1' })).toBeInTheDocument()
  })

  it('is for whoever sells: whoever only voids has today’s orders, and no floor', async () => {
    const requests = serve({ 'GET /api/v1/outlets/o1/orders': () => json(200, listOf([])) })
    const { router } = renderApp('/pos/tables', { ...testUser, permissions: ['order.void'] })

    await waitFor(() => expect(router.state.location.pathname).toBe('/pos/history'))
    await screen.findByRole('heading', { level: 1, name: 'Riwayat hari ini' })
    expect(floorLoads(requests)).toBe(0)
  })
})

describe('number stands at the till', () => {
  const catalogPath = 'GET /api/v1/outlets/o1/pos/catalog'
  const floorPath = 'GET /api/v1/outlets/o1/pos/tables'
  const standField = () => panel().queryByLabelText('Nomor papan')
  const payButton = () => panel().getByRole('button', { name: exactly('Bayar Rp 20.790') })

  /** The API of an outlet seating its customers the way mode() says, with the orders sent kept in sent. */
  function outlet(mode: () => 'table' | 'number', orders: (body: CreateOrderRequest) => Response = (b) => json(201, taken(b))) {
    const sent: CreateOrderRequest[] = []
    cashier(
      (body) => {
        sent.push(body)
        return orders(body)
      },
      {
        [catalogPath]: () => json(200, catalog({ dine_in_mode: mode() })),
        // The server has no tables to pick from where the outlet seats its customers by number stands.
        [floorPath]: () => json(200, mode() === 'table' ? floor : { areas: [] }),
      },
    )
    return sent
  }

  async function payExactly() {
    await userEvent.click(payButton())
    const dialog = within(await screen.findByRole('dialog', { name: 'Bayar tunai' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Uang pas' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Bayar' }))
  }

  async function pickTable(name: RegExp) {
    await userEvent.click(await panel().findByRole('button', { name: /^Pilih meja/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Pilih meja' }))
    await userEvent.click(await dialog.findByRole('button', { name }))
  }

  it("asks a dine-in order for its stand's number, which its receipt shows", async () => {
    const sent = outlet(() => 'number')
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    expect(panel().queryByRole('button', { name: /^Pilih meja/ })).not.toBeInTheDocument()
    const field = panel().getByLabelText('Nomor papan')
    expect(field).toBeRequired()
    expect(field).toHaveAttribute('placeholder', 'Wajib, misalnya 12')
    expect(field).toHaveAttribute('maxlength', '10')
    expect(payButton()).toBeDisabled()

    await userEvent.type(field, ' a5 ')
    expect(payButton()).toBeEnabled()
    await payExactly()

    const done = within(await screen.findByRole('dialog', { name: 'Transaksi tersimpan' }))
    const receipt = within(done.getByRole('article', { name: `Struk BDG01-K01-${day}-0001` }))
    expect(receipt.getByText('Nomor papan')).toBeInTheDocument()
    expect(receipt.getByText('A5')).toBeInTheDocument()
    expect(sent).toEqual([expect.objectContaining({ type: 'dine_in', stand_number: 'A5' })])
    expect('table_id' in sent[0]).toBe(false)

    // Ready for the next customer, without a number.
    await userEvent.click(done.getByRole('button', { name: 'Transaksi baru' }))
    expect(standField()).toHaveValue('')
  })

  it("won't charge until the number is one the server takes, and keeps none for a takeaway", async () => {
    const sent = outlet(() => 'number')
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    await userEvent.click(card('Es Kopi Susu'))
    const field = panel().getByLabelText('Nomor papan')
    await userEvent.type(field, 'B-')
    expect(payButton()).toBeDisabled()
    // What it takes is said once the cashier leaves the field.
    expect(field).not.toBeInvalid()
    await userEvent.tab()
    expect(field).toBeInvalid()
    expect(field).toHaveAccessibleDescription(/1–10 huruf, angka atau tanda hubung, misalnya 12, A5 atau B-3\./)
    await userEvent.type(field, '3')
    expect(field).not.toBeInvalid()
    expect(payButton()).toBeEnabled()

    // A takeaway has no stand, and keeps no number for when it's dine-in again.
    await userEvent.click(panel().getByRole('radio', { name: 'Takeaway' }))
    expect(standField()).not.toBeInTheDocument()
    expect(payButton()).toBeEnabled()
    await userEvent.click(panel().getByRole('radio', { name: 'Dine-in' }))
    expect(standField()).toHaveValue('')
    expect(payButton()).toBeDisabled()
    await userEvent.click(panel().getByRole('radio', { name: 'Takeaway' }))
    await payExactly()
    await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })
    expect(sent).toHaveLength(1)
    expect(sent[0].type).toBe('takeaway')
    expect('stand_number' in sent[0]).toBe(false)
  })

  it('lets go of the table picked when the outlet turns to number stands, and says so', async () => {
    let mode: 'table' | 'number' = 'table'
    const sent = outlet(() => mode)
    const { queryClient } = renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await pickTable(/^Meja A1,/)
    expect(standField()).not.toBeInTheDocument()

    mode = 'number'
    await queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog('o1') })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Outlet ini sekarang memakai Mode Nomor, jadi meja A1 dilepas dari pesanan. Isi nomor papan tamu.',
    )
    expect(panel().queryByText('Meja A1')).not.toBeInTheDocument()
    // The floor loaded before still has tables, none to pick now.
    expect(panel().queryByRole('button', { name: /^Pilih meja/ })).not.toBeInTheDocument()
    expect(payButton()).toBeDisabled()
    // Typing the number, the cashier's next touch, keeps it so.
    await userEvent.type(panel().getByLabelText('Nomor papan'), '7')
    expect(useCart.getState().table).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await payExactly()
    await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })
    expect(sent[0]).toMatchObject({ stand_number: '7' })
    expect('table_id' in sent[0]).toBe(false)
  })

  it("lets go of the stand's number when the outlet turns back to tables, and says so", async () => {
    let mode: 'table' | 'number' = 'number'
    const sent = outlet(() => mode)
    const { queryClient } = renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.type(panel().getByLabelText('Nomor papan'), '12')

    mode = 'table'
    await queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog('o1') })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Outlet ini sekarang memakai Mode Meja, jadi nomor papan 12 dilepas dari pesanan.',
    )
    expect(standField()).not.toBeInTheDocument()
    expect(payButton()).toBeEnabled()
    await payExactly()
    await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })
    expect('stand_number' in sent[0]).toBe(false)
  })

  it('takes the table off when the sale is refused for number stands, and asks for the number', async () => {
    let mode: 'table' | 'number' = 'table'
    const sent = outlet(
      () => mode,
      (body) => {
        if (body.stand_number) return json(201, taken(body))
        // The Manager changed the outlet's way meanwhile.
        mode = 'number'
        return apiError(409, 'dine_in_mode_changed', { mode: 'number' })
      },
    )
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await pickTable(/^Meja A1,/)
    await payExactly()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Outlet ini sekarang memakai Mode Nomor, jadi meja A1 dilepas dari pesanan. Isi nomor papan tamu.',
    )
    expect(useCart.getState().table).toBeNull()
    expect(panel().queryByText('Meja A1')).not.toBeInTheDocument()
    await userEvent.type(await panel().findByLabelText('Nomor papan'), '12')
    await payExactly()
    await screen.findByRole('dialog', { name: 'Transaksi tersimpan' })
    expect(sent).toHaveLength(2)
    expect(sent[0]).toMatchObject({ table_id: 't-a1' })
    expect(sent[1]).toMatchObject({ stand_number: '12' })
    expect('table_id' in sent[1]).toBe(false)
  })

  it('asks for the number when a dine-in order without a table is refused for number stands', async () => {
    let mode: 'table' | 'number' = 'table'
    outlet(
      () => mode,
      () => {
        mode = 'number'
        return apiError(409, 'dine_in_mode_changed', { mode: 'number' })
      },
    )
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await payExactly()

    expect(await screen.findByRole('alert')).toHaveTextContent('Outlet ini sekarang memakai Mode Nomor. Isi nomor papan tamu.')
    expect(await panel().findByLabelText('Nomor papan')).toHaveValue('')
    expect(payButton()).toBeDisabled()
  })

  it("takes the stand's number off when the sale is refused for tables, and says so", async () => {
    let mode: 'table' | 'number' = 'number'
    outlet(
      () => mode,
      () => {
        mode = 'table'
        return apiError(409, 'dine_in_mode_changed', { mode: 'table' })
      },
    )
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })
    await userEvent.click(card('Es Kopi Susu'))
    await userEvent.type(panel().getByLabelText('Nomor papan'), 'a5')
    await payExactly()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Outlet ini sekarang memakai Mode Meja, jadi nomor papan A5 dilepas dari pesanan.',
    )
    expect(useCart.getState().standNumber).toBe('')
    await waitFor(() => expect(standField()).not.toBeInTheDocument())
    expect(payButton()).toBeEnabled()
  })

  it("holds the stand's number of a sale with no answer yet, though the outlet turned to tables since", async () => {
    outlet(() => 'table')
    useCart.setState({ owner: testUser.user_id })
    useCart.getState().setLines(() => [{ menuId: 'm-kopi', name: 'Es Kopi Susu', qty: 1, note: '' }])
    useCart.getState().setStandNumber('12')
    useCart.getState().setPending({
      order_id: 'a1',
      order_no: `BDG01-K01-${day}-0001`,
      type: 'dine_in',
      stand_number: '12',
      client_created_at: new Date().toISOString(),
      items: [{ menu_id: 'm-kopi', qty: 1, price: 18000, note: null }],
      total: 20790,
      payment: { method: 'cash', received: 20790 },
    })
    renderApp('/pos', testUser)
    await screen.findByRole('heading', { level: 1, name: 'Pilih menu' })

    // It goes again as it was sent: nothing comes off, nothing is said.
    const field = panel().getByLabelText('Nomor papan')
    expect(field).toHaveValue('12')
    expect(field).toBeDisabled()
    expect(screen.queryByText(/dilepas dari pesanan/)).not.toBeInTheDocument()
    expect(panel().getByRole('button', { name: 'Kirim ulang' })).toBeInTheDocument()
  })

  it('says on the Tables page that the outlet seats its customers by number stands', async () => {
    // A floor loaded before the change still has tables: the catalog says the way.
    cashier((body) => json(201, taken(body)), {
      [catalogPath]: () => json(200, catalog({ dine_in_mode: 'number' })),
      [floorPath]: () => json(200, floor),
    })
    renderApp('/pos/tables', testUser)

    expect(await screen.findByText(/^Outlet ini memakai Mode Nomor: tamu dine-in membawa papan nomor/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Layout area/ })).not.toBeInTheDocument()
    // Nor an intro that speaks of picking one.
    expect(screen.queryByText(/^Pilih meja untuk melihat statusnya/)).not.toBeInTheDocument()
  })
})

describe("today's orders", () => {
  const paidRequest: CreateOrderRequest = {
    order_id: 'ord1',
    order_no: `BDG01-K01-${day}-0001`,
    type: 'dine_in',
    client_created_at: '2026-10-01T03:04:00Z',
    items: [{ menu_id: 'm-kopi', qty: 2, price: 18000, note: 'less sugar' }],
    total: 0,
    payment: { method: 'cash', received: 50000 },
  }
  const paid = taken(paidRequest)
  const summary = (order: Order): OrderSummary => ({
    order_id: order.order_id,
    order_no: order.order_no,
    device_id: 'd1',
    type: order.type,
    table_name: order.table_name,
    stand_number: order.stand_number,
    status: order.status,
    total: order.total,
    item_count: 2,
    payment_method: 'cash',
    cashier: order.cashier,
    client_created_at: order.client_created_at,
    created_at: order.created_at,
  })

  it("says each order's table, or the number on its stand", async () => {
    const seated = taken({ ...paidRequest, order_id: 'ord2', order_no: `BDG01-K01-${day}-0002`, table_id: 't-a1' })
    const standing = taken({ ...paidRequest, order_id: 'ord3', order_no: `BDG01-K01-${day}-0003`, stand_number: 'A5' })
    serve({
      'GET /api/v1/outlets/o1/orders': () => json(200, listOf([summary(standing), summary(seated), summary(paid)])),
      'GET /api/v1/outlets/o1/pos/tables': () => json(200, floor),
    })
    renderApp('/pos/history', testUser)

    const rows = (await screen.findAllByRole('row')).slice(1)
    // Under the number on a phone, in its column from 640px.
    expect(within(rows[0]).getAllByText('No. A5', { exact: true })).toHaveLength(2)
    expect(rows[0]).not.toHaveTextContent('Tanpa meja')
    expect(rows[1]).toHaveTextContent('Meja A1')
    expect(within(rows[1]).getAllByText('A1', { exact: true })).toHaveLength(1)
    expect(rows[2]).toHaveTextContent('Tanpa meja')
  })

  it('lists them, finds a receipt, prints it again and voids it', async () => {
    const printed = mockPrint()
    let current = paid
    const requests = serve({
      'GET /api/v1/outlets/o1/orders': () => json(200, listOf([summary(current)])),
      'GET /api/v1/outlets/o1/orders/ord1': () => json(200, current),
      'GET /api/v1/outlets/o1/pos/catalog': () => json(200, catalog()),
      'POST /api/v1/outlets/o1/orders/ord1/void': () => {
        current = { ...paid, status: 'void', void_reason: 'Salah input', voided_at: '2026-10-01T04:00:00Z' }
        return json(200, current)
      },
    })
    renderApp('/pos/history', testManager)

    const row = (await screen.findByRole('link', { name: paid.order_no })).closest('tr')!
    expect(row).toHaveTextContent('Rp 41.580')
    expect(row).toHaveTextContent('Lunas')
    await userEvent.click(within(row).getByRole('link', { name: paid.order_no }))

    const receipt = within(await screen.findByRole('article', { name: `Struk ${paid.order_no}` }))
    expect(receipt.getByText('less sugar')).toBeInTheDocument()
    expect(receipt.getByText('Jl. Braga 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cetak ulang' }))
    expect(printed).toEqual([expect.stringContaining('less sugar')])

    await userEvent.click(screen.getByRole('button', { name: 'Void transaksi' }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: 'Void' }))
    expect(dialog.getByText('Wajib diisi.')).toBeInTheDocument()
    await userEvent.type(dialog.getByLabelText('Alasan'), ' Salah input ')
    await userEvent.click(dialog.getByRole('button', { name: 'Void' }))

    expect(await screen.findByText(`Transaksi ${paid.order_no} sudah di-void.`)).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/orders/ord1/void')).toEqual({ reason: 'Salah input' })
    await waitFor(() => expect(screen.getByRole('article', { name: `Struk ${paid.order_no}` })).toHaveTextContent('VOID'))
    expect(screen.queryByRole('button', { name: 'Void transaksi' })).not.toBeInTheDocument()
  })

  it("doesn't offer a void to a cashier without order.void", async () => {
    serve({
      'GET /api/v1/outlets/o1/orders/ord1': () => json(200, paid),
      'GET /api/v1/outlets/o1/pos/catalog': () => json(200, catalog()),
    })
    renderApp('/pos/history/ord1', testUser)
    expect(await screen.findByRole('button', { name: 'Cetak ulang' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Void transaksi' })).not.toBeInTheDocument()
  })
})

describe("the outlet's devices", () => {
  const front = {
    device_id: 'd1',
    code: 'K01',
    name: 'Kasir depan',
    platform: 'web',
    status: 'active',
    activated_by: { user_id: 'm1', name: 'Rina' },
    activated_at: '2026-09-30T02:00:00Z',
    last_seen_at: '2026-10-01T03:00:00Z',
    revoked_at: null,
    revoked_by: null,
  }
  const old = {
    ...front,
    device_id: 'd0',
    code: 'K02',
    name: 'Tablet lama',
    platform: 'android',
    status: 'revoked',
    revoked_at: '2026-09-30T05:00:00Z',
    revoked_by: { user_id: 'm1', name: 'Rina' },
  }

  it('lists them for the Manager, who revokes one', async () => {
    let revoked = false
    const requests = serve({
      'GET /api/v1/outlets/o1/devices': () =>
        json(200, listOf(revoked ? [{ ...front, status: 'revoked' }, old] : [front, old])),
      'DELETE /api/v1/outlets/o1/devices/d1': () => {
        revoked = true
        return new Response(null, { status: 204 })
      },
    })
    renderApp('/admin/outlets/o1/devices', testManager)

    const row = (await screen.findByText('Kasir depan')).closest('tr')!
    const nav = screen.getAllByRole('navigation', { name: 'Menu utama' })[0]
    expect(within(nav).getByRole('link', { name: 'Perangkat' })).toHaveAttribute('aria-current', 'page')
    expect(row).toHaveTextContent('K01')
    expect(row).toHaveTextContent('Aktif')
    expect(screen.getByText('Tablet lama').closest('tr')).toHaveTextContent('Dicabut')
    expect(screen.getAllByRole('button', { name: /^Cabut/ })).toHaveLength(1)

    await userEvent.click(within(row).getByRole('button', { name: 'Cabut Kasir depan' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cabut perangkat' }))
    expect(await screen.findByText('Kasir depan sudah dicabut.')).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'DELETE')).toBe(true)
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Cabut/ })).not.toBeInTheDocument())
  })

  it('is no page for a cashier', async () => {
    serve({ 'GET /api/v1/outlets/o1/orders': () => json(200, listOf([])) })
    const { router } = renderApp('/admin/outlets/o1/devices', testUser)
    await waitFor(() => expect(router.state.location.pathname).toBe('/pos'))
  })
})
