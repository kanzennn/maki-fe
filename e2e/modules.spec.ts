import { expect, request, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'

// Payment Control, the Log Action, the dashboard, realtime and photos against
// a real backend. Needs the backend's Owner (E2E_OWNER_USERNAME,
// E2E_OWNER_PASSWORD); without it these tests skip. Each run makes its own
// outlet and Manager. The backend here has no object storage, so a photo meets
// storage_unavailable: the storage's own side has no browser test.
const owner = { username: process.env.E2E_OWNER_USERNAME ?? '', password: process.env.E2E_OWNER_PASSWORD ?? '' }
const run = Date.now().toString(36).slice(-6)
const manager = { username: `rina.mod.${run}`, password: 'sandi rina 123' }
const setup = { oid: '' }

async function token(api: APIRequestContext, username: string, password: string) {
  const response = await api.post('/api/v1/auth/login', { data: { username, password, client: 'mobile' } })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { access_token: string }).access_token
}

async function signInManager(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(manager.username)
  await page.getByLabel('Password', { exact: true }).fill(manager.password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
}

async function managerPage(browser: Browser) {
  const context = await browser.newContext({ locale: 'id-ID' })
  const page = await context.newPage()
  await signInManager(page)
  return page
}

test.describe('the newer modules against the backend', () => {
  test.skip(!owner.username || !owner.password, 'set E2E_OWNER_USERNAME and E2E_OWNER_PASSWORD to run against a backend')
  // One outlet, used step by step: run in order.
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ baseURL }) => {
    const api = await request.newContext({ baseURL })
    const as = (access: string) => ({ Authorization: `Bearer ${access}` })
    const ownerToken = await token(api, owner.username, owner.password)
    const outlet = await api.post('/api/v1/outlets', {
      headers: as(ownerToken),
      data: { code: `MOD${run}`.toUpperCase(), name: `Modul E2E ${run}`, tax_pct: 10, service_pct: 5 },
    })
    expect(outlet.status()).toBe(201)
    setup.oid = ((await outlet.json()) as { outlet_id: string }).outlet_id
    const temporary = 'sementara 123'
    expect(
      (
        await api.post(`/api/v1/outlets/${setup.oid}/users`, {
          headers: as(ownerToken),
          data: { name: 'Rina Modul', username: manager.username, password: temporary, is_manager: true },
        })
      ).status(),
    ).toBe(201)
    const first = await token(api, manager.username, temporary)
    expect(
      (
        await api.put('/api/v1/me/password', {
          headers: as(first),
          data: { current_password: temporary, new_password: manager.password },
        })
      ).status(),
    ).toBe(204)
    const managerToken = await token(api, manager.username, manager.password)
    expect(
      (
        await api.post(`/api/v1/outlets/${setup.oid}/categories`, {
          headers: as(managerToken),
          data: { name: 'Minuman' },
        })
      ).status(),
    ).toBe(201)
    await api.dispose()
  })

  test('a menu saved in one browser appears in another, unasked', async ({ browser }) => {
    const watching = await managerPage(browser)
    await watching.goto(`/admin/outlets/${setup.oid}/menus`)
    await expect(watching.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible()
    // The live connection is up before the other browser saves.
    await watching.waitForTimeout(1500)

    const saving = await managerPage(browser)
    await saving.goto(`/admin/outlets/${setup.oid}/menus/new`)
    await saving.getByLabel('Nama menu').fill(`Kopi Live ${run}`)
    await saving.getByLabel('Kategori').selectOption({ label: 'Minuman' })
    await saving.getByLabel('Harga').fill('18000')
    await saving.getByRole('button', { name: 'Simpan menu' }).click()
    await expect(saving.getByRole('button', { name: 'Simpan menu' })).toHaveCount(0)

    await expect(watching.getByRole('link', { name: `Kopi Live ${run}` })).toBeVisible({ timeout: 10_000 })
    await watching.context().close()
    await saving.context().close()
  })

  test('the Log Action shows what was saved', async ({ page }) => {
    await signInManager(page)
    await page.goto(`/admin/outlets/${setup.oid}/logs`)
    await expect(page.getByText('Menu dibuat').first()).toBeVisible()
  })

  test('Payment Control keeps cash on, with the others still to come', async ({ page }) => {
    await signInManager(page)
    await page.goto(`/admin/outlets/${setup.oid}/payment-methods`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const toggles = page.getByRole('main').getByRole('checkbox')
    await expect(toggles).toHaveCount(3)
    for (const toggle of await toggles.all()) await expect(toggle).toBeDisabled()
    await expect(page.getByRole('main').getByRole('checkbox', { checked: true })).toHaveCount(1)
    await expect(page.getByText('Segera hadir')).toHaveCount(2)
  })

  test('the dashboard opens with its period', async ({ page }) => {
    await signInManager(page)
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('a photo says so on a server without storage, and the menu form stays', async ({ page }) => {
    await signInManager(page)
    await page.goto(`/admin/outlets/${setup.oid}/menus/new`)
    await page.getByLabel('Nama menu').fill(`Foto ${run}`)
    await page.getByLabel('Kategori').selectOption({ label: 'Minuman' })
    await page.getByLabel('Harga').fill('5000')
    await page.getByLabel('Foto menu').setInputFiles({
      name: 'a.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
    })
    await page.getByRole('button', { name: 'Simpan menu' }).click()
    await expect(page.getByText('Foto belum tersedia di server ini.')).toBeVisible()
    await expect(page.getByLabel('Nama menu')).toHaveValue(`Foto ${run}`)
  })

  test('the header leads to the account page', async ({ page }) => {
    await signInManager(page)
    await page.getByRole('link', { name: 'Akun saya, Rina Modul' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Akun saya' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Simpan' })).toBeDisabled()
    await expect(page.getByRole('link', { name: 'Ganti password' })).toBeVisible()
  })
})
