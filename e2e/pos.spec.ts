import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test'

// The cashier against a real backend. The outlet, its Manager, its cashier,
// its menu and its tables are set up through the API as the Owner and the
// Manager would; then, on screen, the Manager activates the browser as a till
// and sells, prints, finds the sale in today's orders and voids it; the
// cashier sells on the same till, with a voucher, and at a table, which they
// release, and meets a table turned off while it was picked; then by the
// numbers on stands, once the Manager has the outlet take them, and meets the
// outlet turned back to tables while a number was typed; and the Manager
// revokes the till. Needs the backend's Owner
// (E2E_OWNER_USERNAME, E2E_OWNER_PASSWORD); without it these tests skip.
// Each run makes its own outlet and accounts.
const owner = { username: process.env.E2E_OWNER_USERNAME ?? '', password: process.env.E2E_OWNER_PASSWORD ?? '' }
const run = Date.now().toString(36).slice(-6)
const code = `POS${run}`.toUpperCase()
const manager = { username: `rina.pos.${run}`, password: 'sandi rina 123' }
const cashier = { username: `budi.pos.${run}`, password: 'sandi budi 456' }
const voucher = { code: `POS${run}`.toUpperCase(), id: '' }
let ownerToken = ''
/** The outlet and its Manager's access, for what the Manager changes behind the cashier's back. */
const backstage = { outletId: '', managerToken: '' }
const tables = { a1: '', a2: '' }

/** Signs in through the API, as the app does, and returns the access token. */
async function token(api: APIRequestContext, username: string, password: string) {
  const response = await api.post('/api/v1/auth/login', { data: { username, password, client: 'mobile' } })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { access_token: string }).access_token
}

/** An account with a temporary password: signs in and picks its own. */
async function choosePassword(api: APIRequestContext, username: string, temporary: string, own: string) {
  const access = await token(api, username, temporary)
  const response = await api.put('/api/v1/me/password', {
    headers: { Authorization: `Bearer ${access}` },
    data: { current_password: temporary, new_password: own },
  })
  expect(response.status()).toBe(204)
}

test.describe('the cashier against the backend', () => {
  test.skip(!owner.username || !owner.password, 'set E2E_OWNER_USERNAME and E2E_OWNER_PASSWORD to run against a backend')
  // One till, used step by step: run in order, in one browser.
  test.describe.configure({ mode: 'serial' })

  let page: Page
  const sold: string[] = []

  test.beforeAll(async ({ browser, baseURL }) => {
    const api = await request.newContext({ baseURL })
    const as = (access: string) => ({ Authorization: `Bearer ${access}` })
    ownerToken = await token(api, owner.username, owner.password)
    const outlet = await api.post('/api/v1/outlets', {
      headers: as(ownerToken),
      data: { code, name: `Kasir E2E ${run}`, tax_pct: 10, service_pct: 5 },
    })
    expect(outlet.status()).toBe(201)
    const { outlet_id: oid } = (await outlet.json()) as { outlet_id: string }
    expect(
      (
        await api.post(`/api/v1/outlets/${oid}/users`, {
          headers: as(ownerToken),
          data: { name: 'Rina POS', username: manager.username, password: 'sementara 123', is_manager: true },
        })
      ).status(),
    ).toBe(201)
    await choosePassword(api, manager.username, 'sementara 123', manager.password)

    const managerToken = await token(api, manager.username, manager.password)
    backstage.outletId = oid
    backstage.managerToken = managerToken
    const category = await api.post(`/api/v1/outlets/${oid}/categories`, {
      headers: as(managerToken),
      data: { name: 'Minuman' },
    })
    const { category_id } = (await category.json()) as { category_id: string }
    for (const menu of [
      { name: 'Es Kopi Susu', category_id, price: 18000 },
      { name: 'Bolu Pandan', category_id, price: 25000, track_stock: true, initial_stock: 2, stock_alert: 3 },
    ]) {
      expect((await api.post(`/api/v1/outlets/${oid}/menus`, { headers: as(managerToken), data: menu })).status()).toBe(201)
    }
    const roles = (await (await api.get(`/api/v1/outlets/${oid}/roles`, { headers: as(managerToken) })).json()) as {
      data: { role_id: string; name: string }[]
    }
    const kasir = roles.data.find((role) => role.name === 'Kasir')
    expect(
      (
        await api.post(`/api/v1/outlets/${oid}/users`, {
          headers: as(managerToken),
          data: { name: 'Budi POS', username: cashier.username, password: 'sementara 456', role_id: kasir?.role_id },
        })
      ).status(),
    ).toBe(201)
    await choosePassword(api, cashier.username, 'sementara 456', cashier.password)
    // Two tables in Indoor, placed on its layout.
    const area = await api.post(`/api/v1/outlets/${oid}/areas`, { headers: as(managerToken), data: { name: 'Indoor' } })
    const { area_id: aid } = (await area.json()) as { area_id: string }
    for (const [key, name, capacity] of [
      ['a1', 'A1', 4],
      ['a2', 'A2', 2],
    ] as const) {
      const made = await api.post(`/api/v1/outlets/${oid}/tables`, {
        headers: as(managerToken),
        data: { name, area_id: aid, capacity, shape: 'square', is_active: true },
      })
      expect(made.status()).toBe(201)
      tables[key] = ((await made.json()) as { table_id: string }).table_id
    }
    const layout = await api.get(`/api/v1/outlets/${oid}/areas/${aid}/layout`, { headers: as(managerToken) })
    const { version } = (await layout.json()) as { version: number }
    const placed = await api.put(`/api/v1/outlets/${oid}/areas/${aid}/layout`, {
      headers: as(managerToken),
      data: {
        version,
        tables: [
          { table_id: tables.a1, x: 4, y: 4, w: 4, h: 4, rotation: 0, shape: 'square' },
          { table_id: tables.a2, x: 14, y: 4, w: 3, h: 3, rotation: 0, shape: 'square' },
        ],
        decorations: [{ kind: 'cashier', x: 40, y: 0, w: 6, h: 3, rotation: 0 }],
      },
    })
    expect(placed.status()).toBe(200)
    // The Owner's voucher for this outlet: 10% off, a month long.
    const created = await api.post('/api/v1/vouchers', {
      headers: as(ownerToken),
      data: {
        code: voucher.code,
        type: 'percent',
        value: 1000,
        quota: 5,
        expired_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        all_outlets: false,
        outlet_ids: [oid],
      },
    })
    expect(created.status()).toBe(201)
    voucher.id = ((await created.json()) as { voucher_id: string }).voucher_id
    await api.dispose()

    // One browser for every test: the till is this browser, by its cookie.
    page = await browser.newPage()
    // The print dialog would wait for a person; the receipt's print layout
    // is checked by eye.
    await page.addInitScript(() => {
      window.print = () => window.dispatchEvent(new Event('afterprint'))
    })
  })

  test.afterAll(async () => {
    await page.close()
  })

  async function signIn(username: string, password: string) {
    await page.goto('/login')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Masuk' }).click()
  }

  const main = () => page.getByRole('main')
  const detail = () => page.getByRole('region', { name: 'Detail Items' })

  async function pay(button: string) {
    const dialog = page.getByRole('dialog', { name: 'Bayar tunai' })
    await dialog.getByRole('button', { name: button }).click()
    await dialog.getByRole('button', { name: 'Bayar', exact: true }).click()
    return page.getByRole('dialog', { name: 'Transaksi tersimpan' })
  }

  /** The Manager, behind the cashier's back, has the outlet seat its customers at tables or by number stands. */
  async function seatBy(baseURL: string | undefined, mode: 'table' | 'number') {
    const api = await request.newContext({ baseURL })
    const changed = await api.put(`/api/v1/outlets/${backstage.outletId}/dine-in-mode`, {
      headers: { Authorization: `Bearer ${backstage.managerToken}` },
      data: { mode },
    })
    expect(changed.status()).toBe(200)
    await api.dispose()
  }

  test('the Manager activates this browser as a till', async () => {
    await signIn(manager.username, manager.password)
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Kasir' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Perangkat ini belum terdaftar' })).toBeVisible()
    await page.getByLabel('Nama perangkat').fill('Kasir E2E')
    await page.getByRole('button', { name: 'Aktifkan perangkat ini' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Pilih menu' })).toBeVisible()
    await expect(main().getByText('K01 · Kasir E2E')).toBeVisible()
  })

  test('the Manager sells, with change and a receipt', async () => {
    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    await main().getByRole('button', { name: /^Bolu Pandan/ }).click()
    await expect(main().getByRole('button', { name: /^Bolu Pandan/ })).toContainText('Stok menipis')
    // 61,000 + 3,050 service + 6,405 tax.
    await detail().getByRole('button', { name: /^Bayar Rp\s70\.455$/ }).click()
    const done = await pay('Rp 100.000')

    await expect(done.getByText(/Kembalian Rp\s29\.545/)).toBeVisible()
    const receipt = done.getByRole('article')
    await expect(receipt).toContainText(`Kasir E2E ${run}`)
    await expect(receipt).toContainText(/-K01-\d{8}-0001/)
    sold.push((await receipt.textContent())?.match(/[A-Z0-9]+-K01-\d{8}-\d{4}/)?.[0] ?? '')
    await done.getByRole('button', { name: 'Cetak struk' }).click()
    await done.getByRole('button', { name: 'Transaksi baru' }).click()

    await expect(detail().getByText('Belum ada pesanan. Pilih menu untuk mulai.')).toBeVisible()
    // The catalog loaded again: one cake left.
    await expect(main().getByRole('button', { name: /^Bolu Pandan/ })).toContainText('Tersedia 1')
  })

  test("the Manager finds the sale in today's orders and voids it", async () => {
    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Riwayat' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Riwayat hari ini' })).toBeVisible()
    await page.getByLabel('Cari nomor struk').fill('0001')
    const row = main().getByRole('row', { name: new RegExp(sold[0]) })
    await expect(row).toContainText('Lunas')
    await row.getByRole('link', { name: sold[0] }).click()

    await expect(page.getByRole('heading', { level: 1, name: sold[0] })).toBeVisible()
    await page.getByRole('button', { name: 'Void transaksi' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Alasan').fill('Salah input')
    await dialog.getByRole('button', { name: 'Void', exact: true }).click()
    await expect(main().getByText(`Transaksi ${sold[0]} sudah di-void.`)).toBeVisible()
    await expect(main().getByRole('article')).toContainText('VOID')
    await expect(main().getByRole('article')).toContainText('Alasan: Salah input')
  })

  test('the cashier sells on the same till', async () => {
    await page.getByRole('button', { name: 'Keluar' }).click()
    await signIn(cashier.username, cashier.password)

    // The browser is still the till; the void put the cake back.
    await expect(page.getByRole('heading', { level: 1, name: 'Pilih menu' })).toBeVisible()
    await expect(main().getByRole('button', { name: /^Bolu Pandan/ })).toContainText('Tersedia 2')
    await main().getByRole('button', { name: /^Bolu Pandan/ }).click()
    await detail().getByText('Takeaway', { exact: true }).click()
    // 25,000 + 1,250 service + 2,625 tax.
    await detail().getByRole('button', { name: /^Bayar Rp\s28\.875$/ }).click()
    const done = await pay('Uang pas')
    await expect(done.getByRole('article')).toContainText(/-K01-\d{8}-0002/)
    await expect(done.getByRole('article')).toContainText('Budi POS')
    await done.getByRole('button', { name: 'Transaksi baru' }).click()
  })

  test('the cashier sells with a voucher, which the Owner sees used', async ({ baseURL }) => {
    for (let i = 0; i < 3; i++) await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    await detail().getByLabel('Voucher').fill(voucher.code.toLowerCase())
    await detail().getByRole('button', { name: 'Pakai' }).click()
    await expect(detail().getByText(voucher.code, { exact: true })).toBeVisible()
    // 54,000 - 10% = 48,600; service 2,430; tax 5,103.
    await expect(detail().getByText(`Potongan (${voucher.code})`)).toBeVisible()
    await detail().getByRole('button', { name: /^Bayar Rp\s56\.133$/ }).click()
    const done = await pay('Uang pas')
    await expect(done.getByRole('article')).toContainText(`Potongan (${voucher.code})`)
    await expect(done.getByRole('article')).toContainText(/-K01-\d{8}-0003/)
    await done.getByRole('button', { name: 'Transaksi baru' }).click()
    await expect(detail().getByLabel('Voucher')).toHaveValue('')

    const api = await request.newContext({ baseURL })
    const seen = await api.get(`/api/v1/vouchers/${voucher.id}`, { headers: { Authorization: `Bearer ${ownerToken}` } })
    expect(((await seen.json()) as { used_count: number }).used_count).toBe(1)
    await api.dispose()
  })

  test('the cashier sells at a table, and releases it once its customers leave', async () => {
    await detail().getByRole('button', { name: /^Pilih meja/ }).click()
    const picker = page.getByRole('dialog', { name: 'Pilih meja' })
    await picker.getByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' }).click()
    await expect(picker).toBeHidden()
    await expect(detail().getByText('Meja A1')).toBeVisible()
    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    // 18,000 + 900 service + 1,890 tax.
    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    const done = await pay('Uang pas')
    await expect(done.getByRole('article')).toContainText(/Meja\s*A1/)
    await done.getByRole('button', { name: 'Transaksi baru' }).click()
    await expect(detail().getByRole('button', { name: /^Pilih meja/ })).toBeVisible()

    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Meja' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Meja' })).toBeVisible()
    await main().getByRole('button', { name: 'Meja A1, Terisi, 4 kursi' }).click()
    const table = page.getByRole('dialog', { name: 'Meja A1' })
    await expect(table.getByText('Terisi sejak')).toBeVisible()
    await expect(table).toContainText(/Transaksi\s*1/)
    await table.getByRole('button', { name: 'Kosongkan Meja' }).click()
    await page.getByRole('alertdialog', { name: 'Kosongkan meja A1?' }).getByRole('button', { name: 'Kosongkan Meja' }).click()
    await expect(main().getByText('Meja A1 dikosongkan.')).toBeVisible()
    await expect(main().getByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' })).toBeVisible()

    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Riwayat' }).click()
    await expect(main().getByRole('row', { name: /-0004/ })).toContainText('A1')
  })

  test('a table turned off after it was picked comes off the order, and the screen says why', async ({ baseURL }) => {
    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Meja' }).click()
    await main().getByRole('button', { name: 'Meja A2, Tersedia, 2 kursi' }).click()
    await page.getByRole('dialog', { name: 'Meja A2' }).getByRole('button', { name: 'Pesan di meja ini' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Pilih menu' })).toBeVisible()
    await expect(detail().getByText('Meja A2')).toBeVisible()
    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()

    // Meanwhile, the Manager turns A2 off.
    const api = await request.newContext({ baseURL })
    const off = await api.patch(`/api/v1/outlets/${backstage.outletId}/tables/${tables.a2}/status`, {
      headers: { Authorization: `Bearer ${backstage.managerToken}` },
      data: { is_active: false },
    })
    expect(off.status()).toBe(200)
    await api.dispose()

    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Bayar tunai' })
    await dialog.getByRole('button', { name: 'Uang pas' }).click()
    await dialog.getByRole('button', { name: 'Bayar', exact: true }).click()
    await expect(main().getByRole('alert')).toContainText('Meja A2 dilepas dari pesanan: mejanya sedang dinonaktifkan.')
    await expect(detail().getByRole('button', { name: /^Pilih meja/ })).toBeVisible()

    // Sold without it, then.
    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    const done = await pay('Uang pas')
    await expect(done.getByRole('article')).not.toContainText('Meja')
    await done.getByRole('button', { name: 'Transaksi baru' }).click()
  })

  test('on a phone, the floor pans and zooms, and a table still opens', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Meja' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Meja' })).toBeVisible()
    const box = main().locator('[data-scale]')
    await expect(box).toHaveAttribute('data-scale', '1')
    await main().getByRole('button', { name: 'Perbesar layout' }).click()
    await expect(box).toHaveAttribute('data-scale', '1.5')
    await main().getByRole('button', { name: 'Perkecil layout' }).click()
    await expect(box).toHaveAttribute('data-scale', '1')

    // Two fingers spread to twice their distance: twice the size.
    await box.evaluate((el) => {
      const at = (type: string, pointerId: number, clientX: number) =>
        el.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY: 200, bubbles: true, pointerType: 'touch' }))
      at('pointerdown', 1, 100)
      at('pointerdown', 2, 150)
      at('pointermove', 2, 200)
      at('pointerup', 2, 200)
      at('pointerup', 1, 100)
    })
    await expect(box).toHaveAttribute('data-scale', '2')
    await main().getByRole('button', { name: 'Meja A1, Tersedia, 4 kursi' }).click()
    await expect(page.getByRole('dialog', { name: 'Meja A1' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test("the cashier sells by a stand's number once the outlet takes them, and the receipt shows it", async ({ baseURL }) => {
    await seatBy(baseURL, 'number')

    // A takeaway first, which needs no stand either way: the catalog loads
    // again after the sale, and says the outlet's way.
    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Kasir' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Pilih menu' })).toBeVisible()
    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    await detail().getByText('Takeaway', { exact: true }).click()
    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    await (await pay('Uang pas')).getByRole('button', { name: 'Transaksi baru' }).click()

    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    const stand = detail().getByLabel('Nomor papan')
    await expect(stand).toBeVisible()
    await expect(detail().getByRole('button', { name: /^Pilih meja/ })).toHaveCount(0)
    await expect(detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ })).toBeDisabled()
    await stand.fill('b-3')
    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    const done = await pay('Uang pas')
    const receipt = done.getByRole('article')
    await expect(receipt).toContainText(/Nomor papan\s*B-3/)
    const number = (await receipt.textContent())?.match(/[A-Z0-9]+-K01-\d{8}-\d{4}/)?.[0] ?? ''
    await done.getByRole('button', { name: 'Transaksi baru' }).click()
    await expect(stand).toHaveValue('')

    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Riwayat' }).click()
    await expect(main().getByRole('row', { name: new RegExp(number) })).toContainText('No. B-3')

    // Loaded afresh, the till has no Tables to go to, and its Tables page says why.
    await page.goto('/pos/tables')
    await expect(main().getByText(/^Outlet ini memakai Mode Nomor: tamu dine-in membawa papan nomor/)).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Meja' })).toHaveCount(0)
  })

  test("a stand's number typed before the outlet turned back to tables comes off the order, and the screen says why", async ({ baseURL }) => {
    await page.getByRole('navigation', { name: 'Menu kasir' }).getByRole('link', { name: 'Kasir' }).click()
    await main().getByRole('button', { name: /^Es Kopi Susu/ }).click()
    await detail().getByLabel('Nomor papan').fill('12')
    await seatBy(baseURL, 'table')

    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Bayar tunai' })
    await dialog.getByRole('button', { name: 'Uang pas' }).click()
    await dialog.getByRole('button', { name: 'Bayar', exact: true }).click()
    await expect(main().getByRole('alert')).toContainText(
      'Outlet ini sekarang memakai Mode Meja, jadi nomor papan 12 dilepas dari pesanan.',
    )
    await expect(detail().getByLabel('Nomor papan')).toHaveCount(0)
    await expect(detail().getByRole('button', { name: /^Pilih meja/ })).toBeVisible()

    // Sold at no table, then.
    await detail().getByRole('button', { name: /^Bayar Rp\s20\.790$/ }).click()
    const done = await pay('Uang pas')
    await expect(done.getByRole('article')).not.toContainText('Nomor papan')
    await done.getByRole('button', { name: 'Transaksi baru' }).click()
  })

  test('the Manager revokes the till, which then cannot sell', async () => {
    await page.getByRole('button', { name: 'Keluar' }).click()
    await signIn(manager.username, manager.password)
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Perangkat' }).click()

    const row = main().getByRole('row', { name: /K01/ })
    await expect(row).toContainText('Kasir E2E')
    await expect(row).toContainText('Aktif')
    await row.getByRole('button', { name: 'Cabut Kasir E2E' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cabut perangkat' }).click()
    await expect(main().getByText('Kasir E2E sudah dicabut.')).toBeVisible()
    await expect(row).toContainText('Dicabut')

    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Kasir' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Perangkat ini sudah dicabut' })).toBeVisible()
  })
})
