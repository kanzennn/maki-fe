import { expect, test, type Page } from '@playwright/test'

// The admin area against a real backend, as the Owner hands an outlet to its
// Manager: the Owner opens an outlet and gives it a Manager, who sets up a
// role, a cashier, and the menu with its stock, which the Owner then looks
// over. Needs the backend's Owner (E2E_OWNER_USERNAME,
// E2E_OWNER_PASSWORD); without it these tests skip. Each run makes its own
// outlet and accounts, so it can run again on the same database.
const owner = { username: process.env.E2E_OWNER_USERNAME ?? '', password: process.env.E2E_OWNER_PASSWORD ?? '' }
const run = Date.now().toString(36).slice(-6)
const outlet = { name: `Maki E2E ${run}`, code: `E2E${run}`.toUpperCase() }
const manager = { name: 'Rina E2E', username: `rina.${run}`, password: 'sementara 123', own: 'sandi rina 123' }
const cashier = { name: 'Budi E2E', username: `budi.${run}`, password: 'sementara 456' }

test.describe('the admin area against the backend', () => {
  test.skip(!owner.username || !owner.password, 'set E2E_OWNER_USERNAME and E2E_OWNER_PASSWORD to run against a backend')
  // One outlet, set up step by step: run in order.
  test.describe.configure({ mode: 'serial' })

  async function signIn(page: Page, username: string, password: string) {
    await page.goto('/login')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Masuk' }).click()
  }

  const main = (page: Page) => page.getByRole('main')

  test('the Owner opens an outlet, with a cashier role', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()

    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Outlet' }).click()
    await main(page).getByRole('link', { name: 'Tambah outlet' }).click()
    await page.getByLabel('Nama outlet').fill(outlet.name)
    await page.getByLabel('Kode outlet').fill(outlet.code.toLowerCase())
    await page.getByLabel('Jam buka').fill('08:00')
    await page.getByLabel('Jam tutup').fill('22:00')
    await page.getByLabel('Pajak (%)').fill('11')
    await page.getByLabel('Service charge (%)').fill('5,5')
    await page.getByRole('button', { name: 'Simpan outlet' }).click()

    await expect(page.getByRole('heading', { level: 1, name: outlet.name })).toBeVisible()
    await expect(main(page).getByText(outlet.code, { exact: true })).toBeVisible()
    await expect(main(page).getByText('Pajak 11% · Service 5,5%')).toBeVisible()
    await expect(main(page).getByText('Outlet ini belum punya Manager.')).toBeVisible()

    await page.getByRole('navigation', { name: 'Bagian outlet' }).getByRole('link', { name: 'Role' }).click()
    await expect(main(page).getByRole('link', { name: 'Kasir' })).toBeVisible()
  })

  test('the Owner gives it a Manager', async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Outlet' }).click()
    await page.getByLabel('Cari outlet').fill(outlet.code)
    await main(page).getByRole('link', { name: outlet.name }).click()

    await main(page).getByRole('link', { name: 'Tambah Manager' }).click()
    await page.getByLabel('Nama').fill(manager.name)
    await page.getByLabel('Username').fill(manager.username)
    await page.getByLabel('Password sementara', { exact: true }).fill(manager.password)
    await page.getByLabel('Ulangi password sementara').fill(manager.password)
    await page.getByRole('button', { name: 'Simpan Manager' }).click()

    const row = main(page).getByRole('row', { name: new RegExp(manager.name) })
    await expect(row.getByText('Manager')).toBeVisible()
    await page.getByRole('link', { name: 'Info' }).click()
    await expect(main(page).getByRole('link', { name: manager.name })).toBeVisible()
  })

  test('the Manager chooses a password, then sets up a role and a cashier', async ({ page }) => {
    await signIn(page, manager.username, manager.password)
    await expect(page.getByRole('heading', { level: 1, name: 'Ganti password' })).toBeVisible()
    await page.getByLabel('Password saat ini').fill(manager.password)
    await page.getByLabel('Password baru', { exact: true }).fill(manager.own)
    await page.getByLabel('Ulangi password baru').fill(manager.own)
    await page.getByRole('button', { name: 'Simpan password' }).click()
    await page.getByRole('button', { name: 'Lanjut' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Menu utama' })
    await expect(nav.getByRole('link')).toHaveText(['Dasbor', 'Menu', 'Meja', 'Role', 'User', 'Perangkat', 'Voucher', 'Kasir'])
    await expect(page.getByRole('banner')).toContainText(outlet.name)

    await nav.getByRole('link', { name: 'Role' }).click()
    await main(page).getByRole('link', { name: 'Tambah role' }).click()
    await page.getByLabel('Nama role').fill('Pelayan')
    await page.getByLabel('Lihat meja').check()
    await page.getByLabel('Lihat menu').check()
    await page.getByRole('button', { name: 'Simpan role' }).click()
    const pelayan = main(page).getByRole('row', { name: /Pelayan/ })
    await expect(pelayan).toContainText('2 izin')

    await nav.getByRole('link', { name: 'User' }).click()
    await main(page).getByRole('link', { name: 'Tambah user' }).click()
    await page.getByLabel('Nama').fill(cashier.name)
    await page.getByLabel('Username').fill(cashier.username)
    await page.getByLabel('Role').selectOption({ label: 'Kasir' })
    await page.getByLabel('Password sementara', { exact: true }).fill(cashier.password)
    await page.getByLabel('Ulangi password sementara').fill(cashier.password)
    await page.getByRole('button', { name: 'Simpan user' }).click()

    const row = main(page).getByRole('row', { name: new RegExp(cashier.name) })
    await expect(row).toContainText('Kasir')
    await expect(row).toContainText('Belum pernah masuk')
  })

  test('the Manager deactivates the cashier, who can no longer sign in', async ({ page }) => {
    await signIn(page, manager.username, manager.own)
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'User' }).click()
    await main(page).getByRole('link', { name: cashier.name }).click()
    await page.getByRole('button', { name: 'Nonaktifkan' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Nonaktifkan' }).click()
    await expect(page.getByRole('status')).toHaveText(`${cashier.name} dinonaktifkan.`)

    await page.getByRole('button', { name: 'Keluar' }).click()
    await signIn(page, cashier.username, cashier.password)
    await expect(page.getByRole('alert')).toHaveText('Akun ini dinonaktifkan. Hubungi Manager atau Owner.')
  })

  test('the Manager sets up the menu, and counts its stock', async ({ page }) => {
    await signIn(page, manager.username, manager.own)
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Menu' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible()
    await expect(main(page).getByText('Belum ada kategori. Buat kategori dulu, lalu menunya.')).toBeVisible()

    // Categories with their emoji, in the order the cashier shows them.
    await main(page).getByRole('link', { name: 'Kategori' }).click()
    for (const [name, icon] of [
      ['Minuman', '🧋'],
      ['Kue', '🍰'],
    ]) {
      await main(page).getByRole('button', { name: 'Tambah kategori' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Nama kategori').fill(name)
      await dialog.getByText(icon, { exact: true }).click()
      await expect(dialog.getByLabel(icon, { exact: true })).toBeChecked()
      await dialog.getByRole('button', { name: 'Simpan kategori' }).click()
      await expect(page.getByRole('status')).toHaveText(`Kategori ${name} dibuat.`)
    }
    await page.getByRole('button', { name: 'Naikkan Kue' }).click()
    await expect(page.getByRole('status')).toHaveText('Kue sekarang di urutan 1.')
    await expect(page.getByRole('button', { name: 'Turunkan Kue' })).toBeFocused()
    await expect(main(page).getByRole('listitem')).toHaveText([/Kue/, /Minuman/])

    // A menu without stock, and one counted from 10.
    await page.getByRole('link', { name: 'Semua menu' }).click()
    await main(page).getByRole('link', { name: 'Tambah menu' }).click()
    await page.getByLabel('Nama menu').fill('Es Kopi Susu')
    await page.getByLabel('Kategori').selectOption({ label: '🧋 Minuman' })
    await page.getByLabel('Harga').pressSequentially('18000')
    await expect(page.getByLabel('Harga')).toHaveValue('18.000')
    await page.getByRole('button', { name: 'Simpan menu' }).click()
    const coffee = main(page).getByRole('row', { name: /Es Kopi Susu/ })
    await expect(coffee).toContainText('Rp 18.000')
    await expect(coffee).toContainText('Tanpa stok')

    await main(page).getByRole('link', { name: 'Tambah menu' }).click()
    await page.getByLabel('Nama menu').fill('Bolu Pandan')
    await page.getByLabel('Kategori').selectOption({ label: '🍰 Kue' })
    await page.getByLabel('Harga').fill('25000')
    await page.getByText('Stok terlacak', { exact: true }).click()
    await page.getByLabel('Stok awal').fill('10')
    await page.getByLabel('Ambang stok menipis').fill('3')
    await page.getByRole('button', { name: 'Simpan menu' }).click()
    // Kue's menus first: the cashier's order.
    await expect(main(page).getByRole('row').nth(1)).toContainText('Bolu Pandan')
    await expect(main(page).getByRole('row', { name: /Bolu Pandan/ })).toContainText('Rp 25.000')

    // Stock taken out, down to low; the history says who, and why.
    await main(page).getByRole('link', { name: 'Bolu Pandan' }).click()
    await page.getByRole('button', { name: 'Sesuaikan stok' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Kurang', { exact: true }).click()
    await dialog.getByLabel('Jumlah yang dikurangi').fill('8')
    await expect(dialog.getByText('Stok sesudahnya: 2')).toBeVisible()
    await dialog.getByLabel('Catatan').fill('Basi')
    await dialog.getByRole('button', { name: 'Simpan penyesuaian' }).click()
    await expect(page.getByRole('status')).toHaveText('Stok Bolu Pandan sekarang 2.')
    await expect(main(page).getByRole('row', { name: /Kurang · Rusak\/basi/ })).toContainText(`oleh ${manager.name}`)
    await expect(main(page).getByRole('row', { name: /Stok awal/ })).toContainText('+10')

    await page.getByRole('link', { name: 'Semua menu' }).click()
    await expect(main(page).getByRole('row', { name: /Bolu Pandan/ })).toContainText('Menipis')
  })

  test("the Owner sees the outlet's menu, without changing it", async ({ page }) => {
    await signIn(page, owner.username, owner.password)
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Outlet' }).click()
    await page.getByLabel('Cari outlet').fill(outlet.code)
    await main(page).getByRole('link', { name: outlet.name }).click()
    await page.getByRole('navigation', { name: 'Bagian outlet' }).getByRole('link', { name: 'Menu' }).click()

    await expect(main(page).getByRole('row', { name: /Bolu Pandan/ })).toContainText('Menipis')
    await expect(main(page).getByRole('link', { name: 'Tambah menu' })).toHaveCount(0)
    await main(page).getByRole('link', { name: 'Bolu Pandan' }).click()
    await expect(main(page).getByRole('row', { name: /Kurang · Rusak\/basi/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sesuaikan stok' })).toHaveCount(0)
  })

  test("a Manager can't open the Owner's pages", async ({ page }) => {
    await signIn(page, manager.username, manager.own)
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
    await page.goto('/admin/outlets')
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
    await expect(page).toHaveURL(/\/admin$/)
  })
})
