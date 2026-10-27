import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testOutlet, testOwner, testUser, testVoucher } from '@/test/fixtures'

const used = { ...testVoucher, first_used_at: '2026-08-17T03:12:00Z' }
const jakarta = { ...testOutlet, outlet_id: 'o2', code: 'JKT01', name: 'Maki Jakarta' }

/** The query of every request to path so far. */
const queries = (requests: Request[], path: string) =>
  requests
    .filter((r) => r.method === 'GET' && new URL(r.url).pathname === path)
    .map((r) => Object.fromEntries(new URL(r.url).searchParams))

describe('the voucher list', () => {
  it("shows each voucher's terms, use and period, and filters", async () => {
    const requests = serve({ 'GET /api/v1/vouchers': () => json(200, listOf([testVoucher])) })
    const { router } = renderApp('/admin/vouchers', testOwner)
    const user = userEvent.setup()

    const row = (await screen.findByRole('link', { name: 'MERDEKA17' })).closest('tr')!
    for (const text of [
      'Diskon Merdeka',
      '12,5%',
      'maks. Rp 20.000',
      'min. belanja Rp 50.000',
      'Maki Bandung',
      '17 Agu 2026, 00.00 – 31 Agu 2026, 23.59 WIB',
      'Aktif',
    ]) {
      expect(within(row).getByText(text)).toBeInTheDocument()
    }
    // Its column, and on a phone under the status.
    expect(within(row).getAllByText('37 / 100')).toHaveLength(2)

    await user.type(screen.getByLabelText('Cari voucher'), 'merdeka')
    await waitFor(() => expect(queries(requests, '/api/v1/vouchers').at(-1)).toEqual({ q: 'merdeka' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'Habis')
    await waitFor(() => expect(queries(requests, '/api/v1/vouchers').at(-1)).toEqual({ q: 'merdeka', status: 'used_up' }))
    expect(router.state.location.search).toEqual({ q: 'merdeka', status: 'used_up' })
  })

  it('says when there is none yet, and when none matches', async () => {
    serve({ 'GET /api/v1/vouchers': () => json(200, listOf([])) })
    renderApp('/admin/vouchers', testOwner)
    expect(await screen.findByText('Belum ada voucher. Buat yang pertama.')).toBeInTheDocument()
  })

  it('names an amount, every outlet, and a voucher without a start', async () => {
    const amount = { ...testVoucher, type: 'amount' as const, value: 5000, max_discount: null, min_spend: null,
      all_outlets: true, outlets: [], start_at: null, status: 'scheduled' as const }
    serve({ 'GET /api/v1/vouchers': () => json(200, listOf([amount])) })
    renderApp('/admin/vouchers?status=scheduled', testOwner)
    const row = (await screen.findByRole('link', { name: 'MERDEKA17' })).closest('tr')!
    expect(within(row).getByText('Rp 5.000')).toBeInTheDocument()
    expect(within(row).getByText('Semua outlet')).toBeInTheDocument()
    expect(within(row).getByText('Sampai 31 Agu 2026, 23.59 WIB')).toBeInTheDocument()
    expect(within(row).getByText('Terjadwal')).toBeInTheDocument()
  })

  it("is the Owner's alone", async () => {
    serve({})
    const { router } = renderApp('/admin/vouchers', testManager)
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })
})

describe('creating a voucher', () => {
  const outlets = () => json(200, listOf([testOutlet, jakarta]))

  async function fillIn() {
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Kode voucher'), 'merdeka17')
    await user.type(screen.getByLabelText('Potongan (%)'), '12,5')
    await user.type(screen.getByLabelText('Maksimal potongan'), '20000')
    await user.type(screen.getByLabelText('Minimal belanja'), '50000')
    await user.type(screen.getByLabelText('Kuota pemakaian'), '100')
    fireEvent.change(screen.getByLabelText('Mulai (WIB)'), { target: { value: '2026-08-17T00:00' } })
    fireEvent.change(screen.getByLabelText('Expired (WIB)'), { target: { value: '2026-08-31T23:59' } })
    return user
  }

  it('saves it, in WIB and basis points, and opens it', async () => {
    const requests = serve({
      'GET /api/v1/outlets': outlets,
      'POST /api/v1/vouchers': () => json(201, testVoucher),
      'GET /api/v1/vouchers/v1': () => json(200, testVoucher),
      'GET /api/v1/vouchers/v1/redemptions': () => json(200, listOf([])),
    })
    const { router } = renderApp('/admin/vouchers/new', testOwner)
    const user = await fillIn()
    await user.click(screen.getByRole('radio', { name: 'Pilih outlet' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Maki Bandung (BDG01)' }))
    await user.click(screen.getByRole('button', { name: 'Buat voucher' }))

    expect(await screen.findByRole('heading', { level: 1, name: /MERDEKA17/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/vouchers/v1')
    expect(await bodyOf(requests, 'POST', '/api/v1/vouchers')).toEqual({
      code: 'MERDEKA17',
      name: null,
      type: 'percent',
      value: 1250,
      max_discount: 20000,
      min_spend: 50000,
      quota: 100,
      start_at: '2026-08-16T17:00:00.000Z',
      expired_at: '2026-08-31T16:59:00.000Z',
      all_outlets: false,
      outlet_ids: ['o1'],
      is_active: true,
    })
  })

  it('takes an amount, typed as rupiah, without a maximum', async () => {
    const requests = serve({ 'GET /api/v1/outlets': outlets, 'POST /api/v1/vouchers': () => apiError(500, 'internal_error') })
    renderApp('/admin/vouchers/new', testOwner)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Kode voucher'), 'HEMAT5')
    await user.click(screen.getByRole('radio', { name: 'Nominal Rp' }))
    expect(screen.queryByLabelText('Maksimal potongan')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Potongan'), '5000')
    expect(screen.getByLabelText('Potongan')).toHaveValue('5.000')
    await user.type(screen.getByLabelText('Kuota pemakaian'), '10')
    fireEvent.change(screen.getByLabelText('Expired (WIB)'), { target: { value: '2026-08-31T23:59' } })
    await user.click(screen.getByRole('checkbox', { name: 'Aktif' }))
    await user.click(screen.getByRole('button', { name: 'Buat voucher' }))

    await screen.findByRole('alert')
    expect(await bodyOf(requests, 'POST', '/api/v1/vouchers')).toMatchObject({
      type: 'amount',
      value: 5000,
      max_discount: null,
      all_outlets: true,
      outlet_ids: [],
      is_active: false,
    })
  })

  it('checks the fields before calling the server', async () => {
    const requests = serve({ 'GET /api/v1/outlets': outlets })
    renderApp('/admin/vouchers/new', testOwner)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Kode voucher'), 'x')
    await user.type(screen.getByLabelText('Potongan (%)'), '120')
    fireEvent.change(screen.getByLabelText('Mulai (WIB)'), { target: { value: '2026-08-31T23:59' } })
    fireEvent.change(screen.getByLabelText('Expired (WIB)'), { target: { value: '2026-08-31T23:59' } })
    await user.click(screen.getByRole('radio', { name: 'Pilih outlet' }))
    await user.click(screen.getByRole('button', { name: 'Buat voucher' }))

    await waitFor(() => expect(screen.getByLabelText('Kode voucher')).toHaveAccessibleDescription(/Formatnya belum sesuai/))
    expect(screen.getByLabelText('Potongan (%)')).toHaveAccessibleDescription(/Angkanya di luar batas/)
    expect(screen.getByLabelText('Kuota pemakaian')).toHaveAccessibleDescription(/Wajib diisi/)
    expect(screen.getByLabelText('Expired (WIB)')).toHaveAccessibleDescription('Harus setelah waktu mulai.')
    expect(screen.getByText('Wajib diisi.', { selector: 'p[id$="-outlets"]' })).toBeInTheDocument()
    expect(requests.filter((r) => r.method === 'POST')).toHaveLength(0)
  })

  it("puts the server's answers on the fields they are about", async () => {
    serve({ 'GET /api/v1/outlets': outlets, 'POST /api/v1/vouchers': () => apiError(409, 'voucher_code_taken') })
    renderApp('/admin/vouchers/new', testOwner)
    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Buat voucher' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Kode voucher')).toHaveAccessibleDescription(/Kode ini sudah dipakai voucher lain/),
    )
  })

  it("puts the server's field rules on their fields", async () => {
    serve({
      'GET /api/v1/outlets': outlets,
      'POST /api/v1/vouchers': () => apiError(422, 'validation_failed', { fields: { expired_at: 'future' } }),
    })
    renderApp('/admin/vouchers/new', testOwner)
    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Buat voucher' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Expired (WIB)')).toHaveAccessibleDescription('Harus nanti, bukan sekarang atau sebelumnya.'),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('changing a voucher', () => {
  it('keeps a used voucher’s code and type, and says why', async () => {
    const requests = serve({
      'GET /api/v1/outlets': () => json(200, listOf([testOutlet, jakarta])),
      'GET /api/v1/vouchers/v1': () => json(200, used),
      'PUT /api/v1/vouchers/v1': () => json(200, { ...used, quota: 150 }),
      'GET /api/v1/vouchers/v1/redemptions': () => json(200, listOf([])),
    })
    const { router } = renderApp('/admin/vouchers/v1/edit', testOwner)
    const user = userEvent.setup()

    const code = await screen.findByLabelText('Kode voucher')
    expect(code).toHaveValue('MERDEKA17')
    expect(code).toHaveAttribute('readonly')
    expect(screen.getByRole('radio', { name: 'Persen' })).toBeDisabled()
    expect(screen.getByText(/sudah pernah dipakai, jadi kode dan tipenya terkunci/)).toBeInTheDocument()
    expect(screen.getByLabelText('Kuota pemakaian')).toHaveAccessibleDescription('Sudah dipakai: kuota hanya bisa ditambah.')
    expect(await screen.findByRole('checkbox', { name: 'Maki Bandung (BDG01)' })).toBeChecked()
    // Only a new voucher's status is the form's.
    expect(screen.queryByRole('checkbox', { name: 'Aktif' })).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Kuota pemakaian'))
    await user.type(screen.getByLabelText('Kuota pemakaian'), '150')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/vouchers/v1'))
    expect(await bodyOf(requests, 'PUT', '/api/v1/vouchers/v1')).toMatchObject({
      code: 'MERDEKA17',
      type: 'percent',
      value: 1250,
      quota: 150,
      start_at: '2026-08-16T17:00:00.000Z',
      expired_at: '2026-08-31T16:59:00.000Z',
      outlet_ids: ['o1'],
    })
  })

  it("shows the server's rules for a used voucher on their fields", async () => {
    serve({
      'GET /api/v1/outlets': () => json(200, listOf([testOutlet])),
      'GET /api/v1/vouchers/v1': () => json(200, used),
      'PUT /api/v1/vouchers/v1': () =>
        apiError(422, 'validation_failed', { fields: { quota: 'decrease', expired_at: 'earlier' } }),
    })
    renderApp('/admin/vouchers/v1/edit', testOwner)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Simpan' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Kuota pemakaian')).toHaveAccessibleDescription(/kuotanya hanya bisa ditambah/),
    )
    expect(screen.getByLabelText('Expired (WIB)')).toHaveAccessibleDescription(/expired-nya hanya bisa diperpanjang/)
  })
})

describe("a voucher's page", () => {
  const redemptions = listOf([
    { order_id: 'or2', order_no: 'BDG01-K01-20260817-0002', outlet: { outlet_id: 'o1', code: 'BDG01', name: 'Maki Bandung' },
      client_created_at: '2026-08-17T05:30:00Z', voucher_discount: 6250, status: 'void' as const },
    { order_id: 'or1', order_no: 'BDG01-K01-20260817-0001', outlet: { outlet_id: 'o1', code: 'BDG01', name: 'Maki Bandung' },
      client_created_at: '2026-08-17T03:12:00Z', voucher_discount: 20000, status: 'paid' as const },
  ])

  it('shows its terms and the sales that used it', async () => {
    serve({
      'GET /api/v1/vouchers/v1': () => json(200, used),
      'GET /api/v1/vouchers/v1/redemptions': () => json(200, redemptions),
    })
    renderApp('/admin/vouchers/v1', testOwner)

    expect(await screen.findByRole('heading', { level: 1, name: /MERDEKA17/ })).toBeInTheDocument()
    expect(screen.getByText('12,5% · maks. Rp 20.000')).toBeInTheDocument()
    expect(screen.getByText('Rp 50.000')).toBeInTheDocument()
    expect(screen.getByText('17 Agu 2026, 10.12 WIB', { selector: 'dd' })).toBeInTheDocument()

    const table = within(screen.getByRole('region', { name: 'Riwayat pemakaian' }))
    // Each column, and on a phone the ones it leaves out under the receipt number.
    const first = table.getByText('BDG01-K01-20260817-0001').closest('tr')!
    expect(within(first).getAllByText('17 Agu 2026, 10.12 WIB')).toHaveLength(2)
    expect(within(first).getAllByText('Maki Bandung')).toHaveLength(2)
    expect(within(first).getByText('Rp 20.000')).toBeInTheDocument()
    expect(within(first).getAllByText('Lunas')).toHaveLength(2)
    const voided = table.getByText('BDG01-K01-20260817-0002').closest('tr')!
    expect(within(voided).getAllByText('Void')).toHaveLength(2)

    // Used, it stays: deactivating is the way.
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
    expect(screen.getByText(/tidak bisa dihapus, karena transaksinya tetap menyebutnya/)).toBeInTheDocument()
  })

  it('deactivates it after asking', async () => {
    const requests = serve({
      'GET /api/v1/vouchers/v1': () => json(200, testVoucher),
      'GET /api/v1/vouchers/v1/redemptions': () => json(200, listOf([])),
      'PATCH /api/v1/vouchers/v1/status': () => json(200, { ...testVoucher, is_active: false, status: 'inactive' }),
    })
    renderApp('/admin/vouchers/v1', testOwner)
    const user = userEvent.setup()

    expect(await screen.findByText('Belum ada transaksi yang memakai voucher ini.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nonaktifkan' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Nonaktifkan MERDEKA17?' })
    await user.click(within(dialog).getByRole('button', { name: 'Nonaktifkan' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Voucher dinonaktifkan.')
    expect(await bodyOf(requests, 'PATCH', '/api/v1/vouchers/v1/status')).toEqual({ is_active: false })
    expect(screen.getByRole('button', { name: 'Aktifkan' })).toBeInTheDocument()
    expect(screen.getAllByText('Nonaktif').length).toBeGreaterThan(0)
  })

  it('deletes one no sale has used, and goes back to the list', async () => {
    serve({
      'GET /api/v1/vouchers/v1': () => json(200, testVoucher),
      'GET /api/v1/vouchers/v1/redemptions': () => json(200, listOf([])),
      'DELETE /api/v1/vouchers/v1': () => new Response(null, { status: 204 }),
      'GET /api/v1/vouchers': () => json(200, listOf([])),
    })
    const { router } = renderApp('/admin/vouchers/v1', testOwner)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hapus' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Hapus MERDEKA17?' })
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/vouchers'))
    expect(await screen.findByText('Belum ada voucher. Buat yang pertama.')).toBeInTheDocument()
  })

  it('says a voucher deleted since is gone', async () => {
    serve({
      'GET /api/v1/vouchers/v1': () => apiError(404, 'voucher_not_found'),
      'GET /api/v1/vouchers/v1/redemptions': () => apiError(404, 'voucher_not_found'),
    })
    renderApp('/admin/vouchers/v1', testOwner)
    expect(await screen.findByText(/tidak ada, atau sudah dihapus/)).toBeInTheDocument()
  })
})

describe("an outlet's vouchers", () => {
  it('lists them for its Manager, to read', async () => {
    const requests = serve({ 'GET /api/v1/outlets/o1/vouchers': () => json(200, listOf([testVoucher])) })
    renderApp('/admin/outlets/o1/vouchers', testManager)

    const row = (await screen.findByText('MERDEKA17')).closest('tr')!
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
    expect(within(row).getAllByText('37 / 100').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Buat voucher' })).not.toBeInTheDocument()
    // The sidebar and the bottom bar both lead there.
    for (const link of screen.getAllByRole('link', { name: 'Voucher' })) {
      expect(link).toHaveAttribute('href', '/admin/outlets/o1/vouchers')
    }
    expect(queries(requests, '/api/v1/outlets/o1/vouchers')).toEqual([{}])
  })

  it('is not for staff without the fixed role', async () => {
    serve({})
    const { router } = renderApp('/admin/outlets/o1/vouchers', testUser)
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/admin/outlets/o1/vouchers'))
  })
})
