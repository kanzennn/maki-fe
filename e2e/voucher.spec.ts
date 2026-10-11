import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test'

// Vouchers against a real backend. An outlet and its Manager are set up
// through the API as the Owner would; then, on screen, the Owner makes a
// voucher for the outlet, finds it in the list, gives it more uses, turns it
// off and on, and deletes another that no sale used; the outlet's Manager
// reads it, with nothing to change it with. Needs the backend's Owner
// (E2E_OWNER_USERNAME, E2E_OWNER_PASSWORD); without it these tests skip.
// Each run makes its own outlet, Manager and codes.
const owner = { username: process.env.E2E_OWNER_USERNAME ?? '', password: process.env.E2E_OWNER_PASSWORD ?? '' }
const run = Date.now().toString(36).slice(-6)
const outletName = `Voucher E2E ${run}`
const code = `V${run}`.toUpperCase()
const spare = `HAPUS${run}`.toUpperCase()
const manager = { username: `rina.v.${run}`, password: 'sandi rina 123' }

/** Signs in through the API, as the app does, and returns the access token. */
async function token(api: APIRequestContext, username: string, password: string) {
  const response = await api.post('/api/v1/auth/login', { data: { username, password, client: 'mobile' } })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { access_token: string }).access_token
}

/** A time in WIB, days from today, as the form's datetime field takes it. */
function wib(days: number, hhmm: string): string {
  const day = new Date(Date.now() + 7 * 3_600_000 + days * 86_400_000)
  return `${day.toISOString().slice(0, 10)}T${hhmm}`
}

test.describe('vouchers against the backend', () => {
  test.skip(!owner.username || !owner.password, 'set E2E_OWNER_USERNAME and E2E_OWNER_PASSWORD to run against a backend')
  // One voucher, followed step by step: run in order.
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ baseURL }) => {
    const api = await request.newContext({ baseURL })
    const as = (access: string) => ({ Authorization: `Bearer ${access}` })
    const ownerToken = await token(api, owner.username, owner.password)
    const outlet = await api.post('/api/v1/outlets', {
      headers: as(ownerToken),
      data: { code: `VC${run}`.toUpperCase(), name: outletName },
    })
    expect(outlet.status()).toBe(201)
    const { outlet_id: oid } = (await outlet.json()) as { outlet_id: string }
    const created = await api.post(`/api/v1/outlets/${oid}/users`, {
      headers: as(ownerToken),
      data: { name: 'Rina Voucher', username: manager.username, password: 'sementara 123', is_manager: true },
    })
    expect(created.status()).toBe(201)
    const temporary = await token(api, manager.username, 'sementara 123')
    const chosen = await api.put('/api/v1/me/password', {
      headers: as(temporary),
      data: { current_password: 'sementara 123', new_password: manager.password },
    })
    expect(chosen.status()).toBe(204)
    await api.dispose()
  })

  async function signIn(page: Page, username: string, password: string) {
    await page.goto('/login')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
  }

  const main = (page: Page) => page.getByRole('main')
  const nav = (page: Page) => page.getByRole('navigation', { name: 'Menu utama' })

  test('the Owner makes a voucher for the outlet', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await nav(page).getByRole('link', { name: 'Voucher' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Voucher' })).toBeVisible()
    await main(page).getByRole('link', { name: 'Buat voucher' }).click()

    await page.getByLabel('Kode voucher').fill(code.toLowerCase())
    await page.getByLabel('Nama', { exact: true }).fill('Diskon E2E')
    await page.getByLabel('Potongan (%)').fill('12,5')
    await page.getByLabel('Maksimal potongan').fill('20000')
    await page.getByLabel('Minimal belanja').fill('50000')
    await page.getByLabel('Kuota pemakaian').fill('100')
    await page.getByLabel('Mulai (WIB)').fill(wib(0, '00:00'))
    await page.getByLabel('Expired (WIB)').fill(wib(30, '23:59'))
    await page.getByText('Pilih outlet', { exact: true }).click()
    await page.getByRole('checkbox', { name: new RegExp(outletName) }).check()
    await page.getByRole('button', { name: 'Buat voucher' }).click()

    await expect(page.getByRole('heading', { level: 1, name: new RegExp(code) })).toBeVisible()
    await expect(main(page).getByText('12,5% · maks. Rp 20.000')).toBeVisible()
    await expect(main(page).getByText('Rp 50.000')).toBeVisible()
    await expect(main(page).getByText('0 / 100')).toBeVisible()
    await expect(main(page).getByText(outletName)).toBeVisible()
    await expect(main(page).getByText('Belum pernah dipakai')).toBeVisible()
    await expect(main(page).getByText('Belum ada transaksi yang memakai voucher ini.')).toBeVisible()
  })

  test('the Owner finds it and gives it more uses', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await nav(page).getByRole('link', { name: 'Voucher' }).click()
    await page.getByLabel('Cari voucher').fill(code.toLowerCase())
    const row = main(page).getByRole('row', { name: new RegExp(code) })
    await expect(row).toContainText('12,5%')
    await expect(row).toContainText(outletName)
    await expect(row).toContainText('0 / 100')
    await expect(row).toContainText('WIB')
    await expect(row).toContainText('Aktif')

    await row.getByRole('link', { name: code }).click()
    await main(page).getByRole('link', { name: 'Ubah' }).click()
    await expect(page.getByLabel('Kode voucher')).toHaveValue(code)
    await page.getByLabel('Kuota pemakaian').fill('150')
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expect(main(page).getByText('0 / 150')).toBeVisible()
  })

  test('the Owner turns it off, and on again', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await nav(page).getByRole('link', { name: 'Voucher' }).click()
    await page.getByLabel('Cari voucher').fill(code)
    await main(page).getByRole('link', { name: code }).click()

    await main(page).getByRole('button', { name: 'Nonaktifkan' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Nonaktifkan' }).click()
    await expect(page.getByRole('status')).toHaveText('Voucher dinonaktifkan.')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nonaktif')
    await main(page).getByRole('button', { name: 'Aktifkan' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Aktifkan' }).click()
    await expect(page.getByRole('status')).toHaveText('Voucher diaktifkan.')
  })

  test('the Manager reads the outlet’s vouchers, and changes none', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await nav(page).getByRole('link', { name: 'Voucher' }).click()
    const row = main(page).getByRole('row', { name: new RegExp(code) })
    await expect(row).toContainText('0 / 150')
    await expect(row.getByRole('link')).toHaveCount(0)
    await expect(main(page).getByRole('link', { name: 'Buat voucher' })).toHaveCount(0)
  })

  test('the Owner deletes a voucher no sale has used', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await nav(page).getByRole('link', { name: 'Voucher' }).click()
    await main(page).getByRole('link', { name: 'Buat voucher' }).click()
    await page.getByLabel('Kode voucher').fill(spare)
    await page.getByText('Nominal Rp', { exact: true }).click()
    await page.getByLabel('Potongan', { exact: true }).fill('5000')
    await page.getByLabel('Kuota pemakaian').fill('5')
    await page.getByLabel('Expired (WIB)').fill(wib(7, '21:00'))
    await page.getByRole('button', { name: 'Buat voucher' }).click()
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(spare) })).toBeVisible()

    await main(page).getByRole('button', { name: 'Hapus' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Voucher' })).toBeVisible()
    await page.getByLabel('Cari voucher').fill(spare)
    await expect(main(page).getByText('Tidak ada voucher yang cocok.')).toBeVisible()
  })
})
