import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testCategories, testManager, testMenus, testOutlet, testStaff, testUser } from '@/test/fixtures'

const [, bolu] = testMenus
const presign = 'POST /api/v1/uploads/presign'
const ticket = {
  upload_url: 'https://storage.test/private/uploads/abc?X-Amz-Signature=x',
  upload_key: 'uploads/abc',
  expires_at: '2026-10-01T00:05:00Z',
}
const storagePut = 'PUT /private/uploads/abc'
const png = (size = 10) => new File([new Uint8Array(size)], 'kopi.png', { type: 'image/png' })

function menuForm(extra: Parameters<typeof serve>[0] = {}) {
  return serve({
    'GET /api/v1/outlets/o1': () => json(200, testOutlet),
    'GET /api/v1/outlets/o1/categories': () => json(200, listOf(testCategories)),
    'GET /api/v1/outlets/o1/menus': () => json(200, listOf(testMenus)),
    'POST /api/v1/outlets/o1/menus': () => json(201, bolu),
    'GET /api/v1/outlets/o1/menus/m-bolu': () => json(200, bolu),
    'GET /api/v1/outlets/o1/menus/m-bolu/stock-movements': () => json(200, listOf([])),
    ...extra,
  })
}

async function fillNewMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Nama menu'), 'Es Kopi')
  await user.selectOptions(screen.getByLabelText('Kategori'), '🧋 Minuman')
  await user.type(screen.getByLabelText('Harga'), '18000')
}

describe("a menu's photo", () => {
  it('goes straight to the storage, without the token, and its key with the menu', async () => {
    const requests = menuForm({
      [presign]: () => json(200, ticket),
      [storagePut]: () => new Response(null, { status: 200 }),
    })
    renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup()
    await fillNewMenu(user)
    await user.upload(screen.getByLabelText('Foto menu'), png(1234))
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST' && r.url.endsWith('/outlets/o1/menus'))).toBe(true))
    expect(await bodyOf(requests, 'POST', '/api/v1/uploads/presign')).toEqual({
      purpose: 'menu_image',
      content_type: 'image/png',
      size: 1234,
    })
    const put = requests.find((r) => r.method === 'PUT' && r.url === ticket.upload_url)
    expect(put?.headers.get('Content-Type')).toBe('image/png')
    expect(put?.headers.get('Authorization')).toBeNull()
    expect(put?.credentials).not.toBe('include')
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/menus')).toMatchObject({ upload_key: 'uploads/abc' })
  })

  it('sends nothing to the storage for a form that will not save', async () => {
    const requests = menuForm({ [presign]: () => json(200, ticket) })
    renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup()
    await screen.findByLabelText('Nama menu')
    await user.upload(screen.getByLabelText('Foto menu'), png())
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))

    expect(await screen.findByLabelText('Nama menu')).toHaveAccessibleDescription(/^Wajib diisi\./)
    expect(requests.some((r) => r.url.includes('/uploads/'))).toBe(false)
  })

  it('refuses a wrong type or too big a file right away', async () => {
    const requests = menuForm()
    renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup({ applyAccept: false })
    await screen.findByLabelText('Nama menu')

    await user.upload(screen.getByLabelText('Foto menu'), new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Pakai file JPG, PNG, atau WebP.')
    await user.upload(screen.getByLabelText('Foto menu'), png(2 * 1024 * 1024 + 1))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ukuran foto maksimal 2 MB.')
    expect(requests.some((r) => r.url.includes('/uploads/'))).toBe(false)
    expect(screen.queryByRole('button', { name: 'Urungkan' })).not.toBeInTheDocument()
  })

  it('says so when this server has no storage, and keeps the form', async () => {
    const requests = menuForm({ [presign]: () => apiError(503, 'storage_unavailable') })
    renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup()
    await fillNewMenu(user)
    await user.upload(screen.getByLabelText('Foto menu'), png())
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))

    expect(await screen.findByText('Foto belum tersedia di server ini. Simpan tanpa foto dulu.')).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'POST' && r.url.endsWith('/outlets/o1/menus'))).toBe(false)
    expect(screen.getByLabelText('Nama menu')).toHaveValue('Es Kopi')
  })

  it("says so when the storage refuses, and doesn't save the menu", async () => {
    const requests = menuForm({
      [presign]: () => json(200, ticket),
      [storagePut]: () => new Response('<Error/>', { status: 403 }),
    })
    renderApp('/admin/outlets/o1/menus/new', testManager)
    const user = userEvent.setup()
    await fillNewMenu(user)
    await user.upload(screen.getByLabelText('Foto menu'), png())
    await user.click(screen.getByRole('button', { name: 'Simpan menu' }))

    expect(await screen.findByText('Foto gagal dikirim. Coba lagi.')).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'POST' && r.url.endsWith('/outlets/o1/menus'))).toBe(false)
  })

  it('can be taken away, or that undone', async () => {
    const withPhoto = { ...bolu, image_url: 'https://cdn.test/a.webp', image_thumb_url: 'https://cdn.test/a_thumb.webp' }
    const requests = menuForm({
      'GET /api/v1/outlets/o1/menus/m-bolu': () => json(200, withPhoto),
      'PUT /api/v1/outlets/o1/menus/m-bolu': () => json(200, { ...withPhoto, image_url: null, image_thumb_url: null }),
    })
    renderApp('/admin/outlets/o1/menus/m-bolu', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hapus foto' }))
    await user.click(screen.getByRole('button', { name: 'Urungkan' }))
    await user.click(screen.getByRole('button', { name: 'Hapus foto' }))
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true))
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/menus/m-bolu')).toMatchObject({ remove_image: true })
  })

  it('shows small in the list', async () => {
    const withPhoto = { ...bolu, image_url: 'https://cdn.test/a.webp', image_thumb_url: 'https://cdn.test/a_thumb.webp' }
    menuForm({ 'GET /api/v1/outlets/o1/menus': () => json(200, listOf([withPhoto])) })
    renderApp('/admin/outlets/o1/menus', testManager)
    await screen.findByRole('link', { name: bolu.name })
    const img = document.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://cdn.test/a_thumb.webp')
    expect(img).toHaveAttribute('alt', '')
  })
})

describe("an account's photo", () => {
  it('goes with the account when it is saved', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/roles': () => json(200, listOf([])),
      'GET /api/v1/outlets/o1/users/u1': () => json(200, testStaff),
      'GET /api/v1/outlets/o1/users/u1/roles': () => json(200, listOf([])),
      [presign]: () => json(200, ticket),
      [storagePut]: () => new Response(null, { status: 200 }),
      'PUT /api/v1/outlets/o1/users/u1': () => json(200, testStaff),
    })
    renderApp('/admin/outlets/o1/users/u1', testManager)
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Foto profil'), png(99))
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'PUT' && r.url.endsWith('/users/u1'))).toBe(true))
    expect(await bodyOf(requests, 'POST', '/api/v1/uploads/presign')).toEqual({
      purpose: 'user_photo',
      content_type: 'image/png',
      size: 99,
    })
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/users/u1')).toMatchObject({ upload_key: 'uploads/abc' })
  })
})

describe('the account page', () => {
  it("is a click from the header, changes the user's photo, and says it takes a moment", async () => {
    const requests = serve({
      [presign]: () => json(200, ticket),
      [storagePut]: () => new Response(null, { status: 200 }),
      'PUT /api/v1/me/photo': () => new Response(null, { status: 202 }),
    })
    renderApp('/account', testUser)
    const user = userEvent.setup()

    const save = await screen.findByRole('button', { name: 'Simpan' })
    expect(save).toBeDisabled()
    expect(screen.getByRole('link', { name: `Akun saya, ${testUser.name}` })).toHaveAttribute('href', '/account')
    await user.upload(screen.getByLabelText('Foto profil'), png(77))
    await user.click(save)

    expect(await screen.findByText('Foto sedang diproses dan akan tampil beberapa detik lagi.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/me/photo')).toEqual({ upload_key: 'uploads/abc' })
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()
  })

  it("removes the user's photo", async () => {
    const withPhoto = { ...testUser, photo_url: 'https://storage.test/private/users/u1/a.webp?signed' }
    const requests = serve({
      'DELETE /api/v1/me/photo': () => new Response(null, { status: 204 }),
      'GET /api/v1/me': () => json(200, testUser),
    })
    renderApp('/account', withPhoto)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hapus foto' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Foto dihapus.')).toBeInTheDocument()
    expect(requests.some((r) => r.method === 'DELETE')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Hapus foto' })).not.toBeInTheDocument()
  })
})
