import { expect, request, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

// Tables against a real backend. An outlet in WITA and its Manager are set
// up through the API as the Owner would; then, on screen, the Manager makes
// the areas and tables, arranges a layout by pointer, keyboard and typed
// properties, meets a layout someone changed meanwhile, schedules tables
// off, overlapping and from now, turns and deletes tables, and has the
// cashier take number stands instead; the Owner reads it all, with nothing
// to change it with. Needs the backend's Owner
// (E2E_OWNER_USERNAME, E2E_OWNER_PASSWORD); without it these tests skip.
// Each run makes its own outlet and Manager.
const owner = { username: process.env.E2E_OWNER_USERNAME ?? '', password: process.env.E2E_OWNER_PASSWORD ?? '' }
const run = Date.now().toString(36).slice(-6)
const outletName = `Meja E2E ${run}`
const manager = { username: `rina.m.${run}`, password: 'sandi rina 123' }
/** Makassar: UTC+8, WITA. */
const wita = 8 * 3_600_000

/** Signs in through the API, as the app does, and returns the access token. */
async function token(api: APIRequestContext, username: string, password: string) {
  const response = await api.post('/api/v1/auth/login', { data: { username, password, client: 'mobile' } })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { access_token: string }).access_token
}

/** A time in WITA as the form's datetime field takes it: days from today at hh:mm. */
function inWita(days: number, hhmm: string): string {
  return `${new Date(Date.now() + wita + days * 86_400_000).toISOString().slice(0, 10)}T${hhmm}`
}

/** A time in WITA as the form's datetime field takes it, hours from now: this minute for 0. */
function witaIn(hours: number): string {
  return new Date(Date.now() + wita + hours * 3_600_000).toISOString().slice(0, 16)
}

test.describe('tables against the backend', () => {
  test.skip(!owner.username || !owner.password, 'set E2E_OWNER_USERNAME and E2E_OWNER_PASSWORD to run against a backend')
  // One outlet's tables, followed step by step: run in order.
  test.describe.configure({ mode: 'serial' })
  // Tall enough for the editor's canvas and its side panel at once: a drag
  // from the panel ends on a point of the canvas in view.
  test.use({ viewport: { width: 1440, height: 1000 } })

  test.beforeAll(async ({ baseURL }) => {
    const api = await request.newContext({ baseURL })
    const as = (access: string) => ({ Authorization: `Bearer ${access}` })
    const ownerToken = await token(api, owner.username, owner.password)
    const outlet = await api.post('/api/v1/outlets', {
      headers: as(ownerToken),
      data: { code: `MJ${run}`.toUpperCase(), name: outletName, timezone: 'Asia/Makassar' },
    })
    expect(outlet.status()).toBe(201)
    const { outlet_id: oid } = (await outlet.json()) as { outlet_id: string }
    const created = await api.post(`/api/v1/outlets/${oid}/users`, {
      headers: as(ownerToken),
      data: { name: 'Rina Meja', username: manager.username, password: 'sementara 123', is_manager: true },
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
  /** The area's list of tables. */
  const list = (page: Page) => main(page).getByRole('list', { name: /^Meja di / })
  /** A table in the list, by its exact name: A1, not A10. */
  const row = (page: Page, name: string) => list(page).getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
  const canvas = (page: Page) => page.getByRole('group', { name: 'Layout area Indoor' })
  /** A table or decoration on the canvas, by its name: "Meja A1", "Dinding". */
  const onCanvas = (page: Page, name: string) => canvas(page).getByRole('button', { name: new RegExp(`^${name},`) })
  /** The outlet's dine-in mode, at the top of the tables page. */
  const mode = (page: Page) => main(page).getByRole('group', { name: 'Cara kasir mencatat tempat tamu dine-in' })
  const numberNotice = (page: Page) => main(page).getByText(/^Outlet ini memakai Mode Nomor: /)

  async function openTables(page: Page) {
    await nav(page).getByRole('link', { name: 'Meja' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Meja' })).toBeVisible()
  }

  /** A point of the canvas on the screen, in cells from its top left: 2.5 is the middle of the third. */
  async function point(page: Page, x: number, y: number) {
    const box = (await canvas(page).boundingBox())!
    const size = box.width / 48
    return { x: box.x + x * size, y: box.y + y * size }
  }

  /** Drags by pointer from one point of the canvas to another, in cells. */
  async function drag(page: Page, item: Locator, from: { x: number; y: number }, to: { x: number; y: number }) {
    await item.scrollIntoViewIfNeeded()
    const start = await point(page, from.x, from.y)
    const end = await point(page, to.x, to.y)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 8 })
    await page.mouse.up()
  }

  test('the Manager makes the areas, and puts them in order', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await openTables(page)
    await expect(main(page).getByText(/^Belum ada area\. Buat area dulu/)).toBeVisible()

    await main(page).getByRole('link', { name: 'Kelola area' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Area' })).toBeVisible()
    for (const name of ['Indoor', 'Teras', 'Lantai 2']) {
      await main(page).getByRole('button', { name: 'Tambah area' }).click()
      await page.getByRole('dialog').getByLabel('Nama area').fill(name)
      await page.getByRole('dialog').getByRole('button', { name: 'Tambah area' }).click()
      await expect(main(page).getByText(`Area ${name} dibuat.`)).toBeVisible()
    }
    await main(page).getByRole('button', { name: 'Tambah area' }).click()
    await page.getByRole('dialog').getByLabel('Nama area').fill('indoor')
    await page.getByRole('dialog').getByRole('button', { name: 'Tambah area' }).click()
    await expect(page.getByRole('dialog').getByText('Nama ini sudah dipakai area lain di outlet ini.')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click()

    await main(page).getByRole('button', { name: 'Naikkan Lantai 2' }).click()
    await expect(main(page).getByText('Lantai 2 sekarang di urutan 2.')).toBeVisible()
    await main(page).getByRole('listitem').filter({ hasText: 'Teras' }).getByRole('button', { name: 'Ganti nama' }).click()
    await page.getByRole('dialog').getByLabel('Nama area').fill('Outdoor')
    await page.getByRole('dialog').getByRole('button', { name: 'Simpan nama' }).click()
    await expect(main(page).getByText('Nama area diganti menjadi Outdoor.')).toBeVisible()
    await main(page).getByRole('listitem').filter({ hasText: 'Lantai 2' }).getByRole('button', { name: 'Hapus' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(main(page).getByText('Area Lantai 2 dihapus.')).toBeVisible()
    await expect(main(page).getByRole('listitem')).toHaveText([/^Indoor/, /^Outdoor/])
  })

  test('the Manager adds tables, in the order people read numbers', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await openTables(page)
    await expect(main(page).getByRole('link', { name: 'Indoor, 0 meja' })).toHaveAttribute('aria-current', 'page')

    for (const [name, seats, shape] of [
      ['A10', '2', 'Persegi'],
      ['A2', '2', 'Bulat'],
      ['A1', '4', 'Persegi panjang'],
      ['A3', '', 'Persegi'],
    ]) {
      await main(page).getByRole('button', { name: 'Tambah meja' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Nama meja').fill(name)
      if (seats) await dialog.getByLabel('Kapasitas kursi').fill(seats)
      await dialog.getByText(shape, { exact: true }).click()
      await dialog.getByRole('button', { name: 'Tambah meja' }).click()
      await expect(main(page).getByText(`Meja ${name} ditambahkan.`, { exact: false })).toBeVisible()
    }
    const names = list(page).getByRole('listitem').locator('p.text-title-md')
    await expect(names).toHaveText(['A1', 'A2', 'A3', 'A10'])
    await expect(row(page, 'A1')).toContainText('4 kursi')
    await expect(row(page, 'A1')).toContainText('Persegi panjang')
    await expect(row(page, 'A2')).toContainText('Bulat')
    await expect(row(page, 'A3')).toContainText('Tidak diisi')

    await main(page).getByRole('button', { name: 'Tambah meja' }).click()
    await page.getByRole('dialog').getByLabel('Nama meja').fill('a1')
    await page.getByRole('dialog').getByRole('button', { name: 'Tambah meja' }).click()
    await expect(page.getByRole('dialog').getByText('Nama ini sudah dipakai meja lain di outlet ini.')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click()

    await row(page, 'A10').getByRole('button', { name: 'Ubah' }).click()
    await page.getByRole('dialog').getByLabel('Area').selectOption({ label: 'Outdoor' })
    await page.getByRole('dialog').getByRole('button', { name: 'Simpan meja' }).click()
    await expect(main(page).getByText('Perubahan meja A10 disimpan.')).toBeVisible()
    await expect(names).toHaveText(['A1', 'A2', 'A3'])
    await expect(main(page).getByRole('link', { name: 'Outdoor, 1 meja' })).toBeVisible()
  })

  test('the Manager arranges the layout by pointer, keyboard and typed properties', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await openTables(page)
    await main(page).getByRole('link', { name: 'Atur layout' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Atur layout Indoor' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()

    // Placed with its button, at a rectangle's size, then by keyboard.
    await page.getByRole('button', { name: 'Tempatkan meja A1' }).click()
    await expect(onCanvas(page, 'Meja A1')).toHaveAccessibleName('Meja A1, x 0, y 0, 5 × 3 kotak')
    await expect(onCanvas(page, 'Meja A1')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('r')
    await expect(onCanvas(page, 'Meja A1')).toHaveAccessibleName('Meja A1, x 2, y 2, 3 × 5 kotak')

    // Dragged from the panel, centred where it's dropped, then across the canvas.
    const target = await point(page, 20.5, 10.5)
    const box = (await canvas(page).boundingBox())!
    await page
      .getByRole('listitem')
      .filter({ hasText: 'A2' })
      .dragTo(canvas(page), { targetPosition: { x: target.x - box.x, y: target.y - box.y } })
    await expect(onCanvas(page, 'Meja A2')).toHaveAccessibleName('Meja A2, x 19, y 9, 3 × 3 kotak')
    await drag(page, onCanvas(page, 'Meja A2'), { x: 20.5, y: 10.5 }, { x: 25.5, y: 12.5 })
    await expect(onCanvas(page, 'Meja A2')).toHaveAccessibleName('Meja A2, x 24, y 11, 3 × 3 kotak')
    // Its corner, just inside its bottom right, resizes it.
    await drag(page, onCanvas(page, 'Meja A2'), { x: 26.9, y: 13.9 }, { x: 27.9, y: 14.9 })
    await expect(onCanvas(page, 'Meja A2')).toHaveAccessibleName('Meja A2, x 24, y 11, 4 × 4 kotak')

    // On top of A1, the save waits.
    await page.getByLabel('X (kolom)').fill('3')
    await page.getByLabel('Y (baris)').fill('3')
    await expect(main(page).getByRole('alert')).toHaveText('Meja A1, A2 bertumpuk. Geser salah satunya sebelum menyimpan.')
    await expect(page.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()
    await page.getByLabel('X (kolom)').fill('24')
    await expect(main(page).getByRole('alert')).toHaveCount(0)

    // A wall along the bottom.
    await page.getByRole('button', { name: 'Tambah Dinding' }).click()
    await page.getByLabel('X (kolom)').fill('0')
    await page.getByLabel('Lebar').fill('48')
    await page.getByLabel('Y (baris)').fill('31')
    await expect(onCanvas(page, 'Dinding')).toHaveAccessibleName('Dinding, x 0, y 31, 48 × 1 kotak')

    await page.getByRole('button', { name: 'Simpan layout' }).click()
    await expect(main(page).getByText('Layout disimpan. Kasir melihat layout ini mulai sekarang.')).toBeVisible()
    await page.reload()
    await expect(onCanvas(page, 'Meja A1')).toHaveAccessibleName('Meja A1, x 2, y 2, 3 × 5 kotak')
    await expect(onCanvas(page, 'Meja A2')).toHaveAccessibleName('Meja A2, x 24, y 3, 4 × 4 kotak')
    await expect(onCanvas(page, 'Dinding')).toHaveAccessibleName('Dinding, x 0, y 31, 48 × 1 kotak')
    await expect(page.getByRole('button', { name: 'Tempatkan meja A3' })).toBeVisible()

    // Changes not saved: leaving asks first.
    await onCanvas(page, 'Meja A1').focus()
    await page.keyboard.press('ArrowRight')
    await main(page).getByRole('link', { name: 'Kembali ke Meja' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Tetap di sini' }).click()
    await expect(onCanvas(page, 'Meja A1')).toHaveAccessibleName('Meja A1, x 3, y 2, 3 × 5 kotak')
    await page.getByRole('button', { name: 'Batalkan perubahan' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Batalkan perubahan' }).click()
    await expect(onCanvas(page, 'Meja A1')).toHaveAccessibleName('Meja A1, x 2, y 2, 3 × 5 kotak')
    await main(page).getByRole('link', { name: 'Kembali ke Meja' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Meja' })).toBeVisible()
    await expect(main(page).getByRole('img', { name: 'Layout area Indoor' })).toBeVisible()
  })

  test("the Manager's editor finds the layout changed meanwhile, and starts again from it", async ({ browser, baseURL }) => {
    const first = await (await browser.newContext({ baseURL, locale: 'id-ID' })).newPage()
    const second = await (await browser.newContext({ baseURL, locale: 'id-ID' })).newPage()
    await signIn(first, manager.username, manager.password)
    await signIn(second, manager.username, manager.password)
    await openTables(first)
    await main(first).getByRole('link', { name: 'Atur layout' }).click()
    await expect(onCanvas(first, 'Meja A1')).toBeVisible()

    await openTables(second)
    await main(second).getByRole('link', { name: 'Atur layout' }).click()
    await second.getByRole('button', { name: 'Tempatkan meja A3' }).click()
    await second.getByRole('button', { name: 'Simpan layout' }).click()
    await expect(main(second).getByText(/^Layout disimpan\./)).toBeVisible()

    await onCanvas(first, 'Meja A1').focus()
    await first.keyboard.press('ArrowDown')
    await first.getByRole('button', { name: 'Simpan layout' }).click()
    await expect(main(first).getByText(/^Layout atau meja di area ini berubah sejak editor dibuka\./)).toBeVisible()
    await first.getByRole('button', { name: 'Muat ulang layout' }).click()
    await expect(main(first).getByText('Layout terbaru sudah dimuat. Perubahan Anda sebelumnya tidak disimpan.')).toBeVisible()
    await expect(onCanvas(first, 'Meja A3')).toBeVisible()
    await expect(onCanvas(first, 'Meja A1')).toHaveAccessibleName('Meja A1, x 2, y 2, 3 × 5 kotak')
    await first.context().close()
    await second.context().close()
  })

  test('the Manager schedules tables off, overlapping and from now', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await openTables(page)
    await main(page).getByRole('link', { name: 'Jadwal meja' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Jadwal meja' })).toBeVisible()
    await expect(main(page).getByText('Belum ada jadwal.')).toBeVisible()
    await expect(main(page).getByText(/Waktu dalam WITA/)).toBeVisible()

    await main(page).getByRole('link', { name: 'Buat jadwal' }).click()
    await page.getByLabel('Judul atau alasan').fill('Acara kantor')
    await page.getByLabel('Mulai (WITA)').fill(inWita(1, '10:00'))
    await page.getByLabel('Selesai (WITA)').fill(inWita(1, '15:00'))
    await page.getByRole('checkbox', { name: 'Semua meja Indoor' }).click()
    await expect(main(page).getByText('3 dari 3 dipilih')).toBeVisible()
    await page.getByRole('button', { name: 'Buat jadwal' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Acara kantor/ })).toContainText('Akan datang')
    await expect(main(page).getByText('A1, A2, A3')).toBeVisible()
    await expect(main(page).getByText(/10\.00 WITA$/)).toBeVisible()

    // Overlapping it at A1: a warning, then saved anyway.
    await main(page).getByRole('link', { name: 'Kembali ke Jadwal meja' }).click()
    await main(page).getByRole('link', { name: 'Buat jadwal' }).click()
    await page.getByLabel('Judul atau alasan').fill('Arisan')
    await page.getByLabel('Mulai (WITA)').fill(inWita(1, '12:00'))
    await page.getByLabel('Selesai (WITA)').fill(inWita(1, '16:00'))
    await page.getByRole('checkbox', { name: 'A1', exact: true }).click()
    await page.getByRole('button', { name: 'Buat jadwal' }).click()
    const warning = main(page).getByRole('alert')
    await expect(warning).toContainText('Bentrok dengan jadwal lain di meja yang sama:')
    await expect(warning).toContainText('Acara kantor')
    await warning.getByRole('button', { name: 'Simpan tetap' }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Arisan/ })).toBeVisible()

    // From this minute for two hours, before Acara kantor: A2 is out at once.
    await main(page).getByRole('link', { name: 'Kembali ke Jadwal meja' }).click()
    await main(page).getByRole('link', { name: 'Buat jadwal' }).click()
    await page.getByLabel('Judul atau alasan').fill('Renovasi')
    await page.getByRole('checkbox', { name: 'A2', exact: true }).click()
    const fromNow = async () => {
      await page.getByLabel('Mulai (WITA)').fill(witaIn(0))
      await page.getByLabel('Selesai (WITA)').fill(witaIn(2))
      await page.getByRole('button', { name: 'Buat jadwal' }).click()
    }
    await fromNow()
    // The minute may turn between filling the form and the server reading it: once more, then.
    const past = page.getByText('Mulai tidak boleh sebelum sekarang.')
    const saved = page.getByRole('heading', { level: 1, name: /Renovasi/ })
    await expect(past.or(saved)).toBeVisible()
    if (await past.isVisible()) await fromNow()
    await expect(saved).toContainText('Berlangsung')
    await openTables(page)
    await expect(row(page, 'A2')).toContainText('Nonaktif terjadwal')
    await expect(main(page).getByRole('img', { name: 'Layout area Indoor' })).toBeVisible()

    // Cancelled, it stays as history, and A2 is back.
    await main(page).getByRole('link', { name: 'Jadwal meja' }).click()
    await main(page).getByRole('link', { name: 'Renovasi' }).click()
    await main(page).getByRole('button', { name: 'Batalkan jadwal' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Batalkan jadwal' }).click()
    await expect(main(page).getByText('Jadwal Renovasi dibatalkan.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Renovasi/ })).toContainText('Dibatalkan')
    await expect(main(page).getByRole('link', { name: 'Ubah' })).toHaveCount(0)
    await main(page).getByRole('link', { name: 'Kembali ke Jadwal meja' }).click()
    await page.getByLabel('Status').selectOption({ label: 'Dibatalkan' })
    await expect(main(page).getByRole('link', { name: 'Renovasi' })).toBeVisible()
    await expect(main(page).getByRole('link', { name: 'Acara kantor' })).toHaveCount(0)
    await openTables(page)
    await expect(row(page, 'A2')).toContainText('Tersedia')
  })

  test('the Manager turns a table off, and deletes one', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await openTables(page)

    await row(page, 'A1').getByRole('button', { name: 'Nonaktifkan' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Nonaktifkan' }).click()
    await expect(main(page).getByText('Meja A1 dinonaktifkan.')).toBeVisible()
    await expect(row(page, 'A1').getByText('Nonaktif', { exact: true })).toBeVisible()
    await expect(row(page, 'A1').getByRole('button', { name: 'Aktifkan' })).toBeVisible()

    await row(page, 'A3').getByRole('button', { name: 'Hapus' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' }).click()
    await expect(main(page).getByText('Meja A3 dihapus.')).toBeVisible()
    await expect(row(page, 'A3')).toHaveCount(0)

    await main(page).getByRole('link', { name: 'Kelola area' }).click()
    await main(page).getByRole('listitem').filter({ hasText: 'Indoor' }).getByRole('button', { name: 'Hapus' }).click()
    await expect(page.getByRole('alertdialog')).toContainText('Area ini masih berisi 2 meja.')
    await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Hapus' })).toHaveCount(0)
  })

  test('the Manager has the cashier take number stands instead, the tables kept', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await openTables(page)
    await expect(mode(page).getByRole('radio', { name: 'Meja', exact: true })).toBeChecked()
    await expect(main(page).getByRole('button', { name: 'Simpan mode' })).toBeDisabled()
    await expect(numberNotice(page)).toHaveCount(0)

    await mode(page).getByText('Nomor papan', { exact: true }).click()
    await main(page).getByRole('button', { name: 'Simpan mode' }).click()
    await expect(page.getByRole('alertdialog')).toContainText('Pakai Mode Nomor?')
    await expect(page.getByRole('alertdialog')).toContainText('Area, layout dan meja tetap tersimpan.')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Ganti mode' }).click()
    await expect(main(page).getByText('Outlet ini sekarang memakai Mode Nomor.')).toBeVisible()
    await expect(numberNotice(page)).toBeVisible()
    await expect(main(page).getByRole('button', { name: 'Simpan mode' })).toBeDisabled()

    // Saved: the page, loaded again, reads it from the API, and the tables stay.
    await page.reload()
    await expect(mode(page).getByRole('radio', { name: 'Nomor papan', exact: true })).toBeChecked()
    await expect(numberNotice(page)).toBeVisible()
    await expect(row(page, 'A2')).toBeVisible()
  })

  test('the Owner reads the mode, the tables and schedules, with nothing to change them with', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await nav(page).getByRole('link', { name: 'Outlet' }).click()
    await page.getByLabel('Cari outlet').fill(outletName)
    await main(page).getByRole('link', { name: outletName }).click()
    await page.getByRole('navigation', { name: 'Bagian outlet' }).getByRole('link', { name: 'Meja' }).click()

    await expect(page.getByRole('heading', { level: 2, name: 'Meja' })).toBeVisible()
    await expect(mode(page).getByRole('radio', { name: 'Nomor papan', exact: true })).toBeChecked()
    await expect(mode(page).getByRole('radio', { name: 'Meja', exact: true })).toBeDisabled()
    await expect(main(page).getByRole('button', { name: 'Simpan mode' })).toHaveCount(0)
    await expect(numberNotice(page)).toBeVisible()
    await expect(main(page).getByRole('img', { name: 'Layout area Indoor' })).toBeVisible()
    await expect(row(page, 'A1').getByText('Nonaktif', { exact: true })).toBeVisible()
    await expect(main(page).getByRole('button', { name: 'Tambah meja' })).toHaveCount(0)
    await expect(main(page).getByRole('link', { name: 'Atur layout' })).toHaveCount(0)
    await expect(main(page).getByRole('button', { name: 'Ubah' })).toHaveCount(0)

    await main(page).getByRole('link', { name: 'Jadwal meja' }).click()
    await expect(main(page).getByRole('link', { name: 'Buat jadwal' })).toHaveCount(0)
    await main(page).getByRole('link', { name: 'Acara kantor' }).click()
    await expect(page.getByRole('heading', { level: 2, name: /Acara kantor/ })).toBeVisible()
    await expect(main(page).getByRole('link', { name: 'Ubah' })).toHaveCount(0)
    await expect(main(page).getByRole('button', { name: 'Batalkan jadwal' })).toHaveCount(0)
  })
})
