// page.evaluate callbacks run in the browser.
/// <reference lib="dom" />
import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

// Signing in against a real backend. Needs an account (E2E_USERNAME,
// E2E_PASSWORD) whose email the tests may confirm and whose password they may
// reset, and the worker's log (E2E_WORKER_LOG) for the emailed links, which
// the development log mailer writes there. Without them these tests skip.
const username = process.env.E2E_USERNAME ?? ''
let password = process.env.E2E_PASSWORD ?? ''
const workerLog = process.env.E2E_WORKER_LOG ?? ''

test.describe('signing in against the backend', () => {
  test.skip(!username || !password, 'set E2E_USERNAME and E2E_PASSWORD to run against a backend')
  // One account, changed along the way: run in order.
  test.describe.configure({ mode: 'serial' })

  async function signIn(page: Page, pw: string) {
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(pw)
    await page.getByRole('button', { name: 'Masuk' }).click()
  }

  test('a wrong password is refused, in words', async ({ page }) => {
    await page.goto('/login')
    await signIn(page, 'not the password')
    await expect(page.getByRole('alert')).toHaveText('Username atau password salah.')
  })

  test('signs in, survives a reload, and signs out', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin$/)

    await signIn(page, password)
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()

    // The access token lived in memory only; the HttpOnly cookie brings the
    // session back.
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
    const cookie = (await page.context().cookies()).find((c) => c.name === 'maki_refresh')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('Strict')
    expect(await page.evaluate(() => document.cookie)).not.toContain('maki_refresh')

    await page.getByRole('button', { name: 'Keluar' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Masuk' })).toBeVisible()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  /** The path and fragment of the newest emailed link to path, from the worker's log. */
  async function emailedLink(path: string, after = ''): Promise<string> {
    const pattern = new RegExp(`${path}#token=[A-Za-z0-9_-]+`, 'g')
    for (let i = 0; i < 50; i++) {
      const links = readFileSync(workerLog, 'utf8').match(pattern) ?? []
      const newest = links.at(-1)
      if (newest && newest !== after) return newest
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    throw new Error(`no ${path} link in ${workerLog}`)
  }

  test('confirms the email address from the emailed link', async ({ page }) => {
    test.skip(!workerLog, 'set E2E_WORKER_LOG to read the emailed links')
    await page.goto(await emailedLink('/verify-email'))
    await expect(page).toHaveURL(/\/verify-email$/) // the token left the address bar
    await page.getByRole('button', { name: 'Konfirmasi email' }).click()
    await expect(page.getByRole('status')).toHaveText('Email sudah dikonfirmasi.')
  })

  test('resets the password from the emailed link', async ({ page }) => {
    test.skip(!workerLog, 'set E2E_WORKER_LOG to read the emailed links')
    const before = await emailedLink('/reset-password').catch(() => '')

    await page.goto('/login')
    await page.getByRole('link', { name: 'Lupa password?' }).click()
    await page.getByLabel('Username atau email').fill(username)
    await page.getByRole('button', { name: 'Kirim link' }).click()
    await expect(page.getByRole('status')).toContainText('Jika akun terdaftar')

    await page.goto(await emailedLink('/reset-password', before))
    const next = `${password} baru`
    await page.getByLabel('Password baru', { exact: true }).fill(next)
    await page.getByLabel('Ulangi password baru').fill(next)
    await page.getByRole('button', { name: 'Simpan password' }).click()
    await expect(page.getByRole('status')).toContainText('Password sudah diganti')
    password = next

    await page.getByRole('link', { name: 'Masuk' }).click()
    await signIn(page, password)
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible()
  })
})
