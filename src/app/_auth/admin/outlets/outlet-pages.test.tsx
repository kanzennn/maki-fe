import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testOutlet, testOwner, testRoles } from '@/test/fixtures'

const inactive = { ...testOutlet, status: 'inactive' as const }

/** The query of every outlet list request so far. */
const listQueries = (requests: Request[]) =>
  requests
    .filter((r) => r.method === 'GET' && new URL(r.url).pathname === '/api/v1/outlets')
    .map((r) => Object.fromEntries(new URL(r.url).searchParams))

describe('the outlet list', () => {
  it('searches as the Owner types, and filters by status', async () => {
    const requests = serve({ 'GET /api/v1/outlets': () => json(200, listOf([testOutlet])) })
    const { router } = renderApp('/admin/outlets', testOwner)
    const user = userEvent.setup()

    const row = (await screen.findByRole('link', { name: 'Maki Bandung' })).closest('tr')!
    expect(within(row).getByText('BDG01')).toBeInTheDocument()
    expect(within(row).getByText('Rina')).toBeInTheDocument()
    expect(within(row).getByText('Aktif')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Cari outlet'), 'bdg')
    await waitFor(() => expect(listQueries(requests).at(-1)).toEqual({ q: 'bdg' }))
    expect(router.state.location.search).toEqual({ q: 'bdg' })

    await user.selectOptions(screen.getByLabelText('Status'), 'Nonaktif')
    await waitFor(() => expect(listQueries(requests).at(-1)).toEqual({ q: 'bdg', status: 'inactive' }))
  })

  it('says when nothing matches, and when there is nothing yet', async () => {
    serve({ 'GET /api/v1/outlets': () => json(200, listOf([])) })
    renderApp('/admin/outlets?q=%22zzz%22', testOwner)
    expect(await screen.findByText('Tidak ada outlet yang cocok dengan pencarian ini.')).toBeInTheDocument()
  })

  it('keeps its filter and page in the address bar, the first page left out, and Back brings them back', async () => {
    // 45 outlets, a page of 20 at a time, named after the page they're on.
    const requests = serve({
      'GET /api/v1/outlets': (request) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? '1')
        return json(200, { data: [{ ...testOutlet, name: `Maki ${page}` }], meta: { page, page_size: 20, total: 45 } })
      },
    })
    const { router } = renderApp('/admin/outlets', testOwner)
    const user = userEvent.setup()
    await screen.findByRole('link', { name: 'Maki 1' })

    await user.click(screen.getByRole('button', { name: 'Halaman berikutnya' }))
    expect(await screen.findByRole('link', { name: 'Maki 2' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ page: 2 })
    expect(listQueries(requests).at(-1)).toEqual({ page: '2' })

    // A new filter starts again from the first page.
    await user.selectOptions(screen.getByLabelText('Status'), 'Nonaktif')
    await waitFor(() => expect(router.state.location.search).toEqual({ status: 'inactive' }))
    expect(await screen.findByRole('link', { name: 'Maki 1' })).toBeInTheDocument()
    expect(listQueries(requests).at(-1)).toEqual({ status: 'inactive' })

    router.history.back()
    expect(await screen.findByRole('link', { name: 'Maki 2' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ page: 2 })
    expect(screen.getByLabelText('Status')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Halaman sebelumnya' }))
    expect(await screen.findByRole('link', { name: 'Maki 1' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({})
  })

  it('shows the latest search, whichever answer comes last', async () => {
    let answerEarlier: (response: Response) => void = () => {}
    const requests = serve({
      'GET /api/v1/outlets': (request) => {
        const q = new URL(request.url).searchParams.get('q')
        // The earlier search's answer waits until the test sends it.
        if (q === 'ma') return new Promise<Response>((resolve) => (answerEarlier = resolve))
        return json(200, listOf([q === 'mak' ? { ...testOutlet, name: 'Maki Kopo' } : testOutlet]))
      },
    })
    const { router } = renderApp('/admin/outlets', testOwner)
    const user = userEvent.setup()
    await screen.findByRole('link', { name: 'Maki Bandung' })

    await user.type(screen.getByLabelText('Cari outlet'), 'ma')
    await waitFor(() => expect(listQueries(requests).at(-1)).toEqual({ q: 'ma' }))
    await user.type(screen.getByLabelText('Cari outlet'), 'k')
    expect(await screen.findByRole('link', { name: 'Maki Kopo' })).toBeInTheDocument()

    answerEarlier(json(200, listOf([{ ...testOutlet, name: 'Maki Lama' }])))
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(screen.getByRole('link', { name: 'Maki Kopo' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Maki Lama' })).not.toBeInTheDocument()
    expect(router.state.location.search).toEqual({ q: 'mak' })
  })
})

describe('adding an outlet', () => {
  async function fillIn() {
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nama outlet'), 'Maki Bandung')
    await user.type(screen.getByLabelText('Kode outlet'), 'bdg01')
    await user.clear(screen.getByLabelText('Pajak (%)'))
    await user.type(screen.getByLabelText('Pajak (%)'), '11')
    await user.clear(screen.getByLabelText('Service charge (%)'))
    await user.type(screen.getByLabelText('Service charge (%)'), '5,5')
    return user
  }

  it('saves it and opens it, to add a Manager', async () => {
    const requests = serve({
      'POST /api/v1/outlets': () => json(201, testOutlet),
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
    })
    const { router } = renderApp('/admin/outlets/new', testOwner)
    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Simpan outlet' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Maki Bandung' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/outlets/o1')
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets')).toEqual({
      code: 'bdg01',
      name: 'Maki Bandung',
      address: null,
      phone: null,
      timezone: 'Asia/Jakarta',
      locale: 'id',
      open_time: null,
      close_time: null,
      tax_pct: 11,
      service_pct: 5.5,
    })
  })

  it('checks the fields before calling the server', async () => {
    const requests = serve({})
    renderApp('/admin/outlets/new', testOwner)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Kode outlet'), 'x')
    await user.type(screen.getByLabelText('Jam buka'), '08:00')
    await user.click(screen.getByRole('button', { name: 'Simpan outlet' }))

    await waitFor(() => expect(screen.getByLabelText('Nama outlet')).toHaveAccessibleDescription('Wajib diisi.'))
    expect(screen.getByLabelText('Kode outlet')).toHaveAccessibleDescription(/Formatnya belum sesuai/)
    expect(screen.getByLabelText('Jam tutup')).toHaveAccessibleDescription('Wajib diisi.')
    expect(requests.filter((r) => r.method === 'POST')).toHaveLength(0)
  })

  it("shows the server's answers on the fields they are about", async () => {
    serve({ 'POST /api/v1/outlets': () => apiError(409, 'outlet_code_taken') })
    renderApp('/admin/outlets/new', testOwner)
    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Simpan outlet' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Kode outlet')).toHaveAccessibleDescription(/Kode ini sudah dipakai outlet lain/),
    )
  })

  it("puts the server's field rules on their fields", async () => {
    serve({ 'POST /api/v1/outlets': () => apiError(422, 'validation_failed', { fields: { timezone: 'timezone' } }) })
    renderApp('/admin/outlets/new', testOwner)
    const user = await fillIn()
    await user.click(screen.getByRole('button', { name: 'Simpan outlet' }))

    await waitFor(() => expect(screen.getByLabelText('Zona waktu')).toHaveAccessibleDescription('Zona waktu tidak dikenal.'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe("an outlet's page", () => {
  it('deactivates the outlet after asking', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'PATCH /api/v1/outlets/o1/status': () => json(200, inactive),
    })
    renderApp('/admin/outlets/o1', testOwner)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Nonaktifkan outlet' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Nonaktifkan Maki Bandung?' })
    await user.click(within(dialog).getByRole('button', { name: 'Nonaktifkan outlet' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Maki Bandung dinonaktifkan.')
    expect(await bodyOf(requests, 'PATCH', '/api/v1/outlets/o1/status')).toEqual({ status: 'inactive' })
    // Now it may go, and not before.
    expect(screen.getByRole('button', { name: 'Hapus outlet' })).toBeInTheDocument()
  })

  it('offers no delete while the outlet is active', async () => {
    serve({ 'GET /api/v1/outlets/o1': () => json(200, testOutlet) })
    renderApp('/admin/outlets/o1', testOwner)

    expect(await screen.findByRole('button', { name: 'Nonaktifkan outlet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus outlet' })).not.toBeInTheDocument()
  })

  it('deletes an inactive outlet once its name is typed again', async () => {
    const requests = serve({
      'GET /api/v1/outlets/o1': () => json(200, inactive),
      'DELETE /api/v1/outlets/o1': () => json(204),
      'GET /api/v1/outlets': () => json(200, listOf([])),
    })
    const { router } = renderApp('/admin/outlets/o1', testOwner)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Hapus outlet' }))
    const dialog = screen.getByRole('dialog', { name: 'Hapus Maki Bandung?' })
    const submit = within(dialog).getByRole('button', { name: 'Hapus outlet' })
    const confirm = within(dialog).getByLabelText('Ketik "Maki Bandung" untuk konfirmasi')
    await user.type(confirm, 'maki bandung')
    expect(submit).toBeDisabled()
    await user.clear(confirm)
    await user.type(confirm, 'Maki Bandung ')
    await user.click(submit)

    expect(await screen.findByRole('heading', { level: 1, name: 'Outlet' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/outlets')
    expect(await bodyOf(requests, 'DELETE', '/api/v1/outlets/o1')).toEqual({ confirm_name: 'Maki Bandung ' })
  })

  it("lists the outlet's Managers, and its roles read only", async () => {
    serve({
      'GET /api/v1/outlets/o1': () => json(200, testOutlet),
      'GET /api/v1/outlets/o1/roles': () => json(200, listOf(testRoles)),
    })
    renderApp('/admin/outlets/o1', testOwner)
    const user = userEvent.setup()

    expect(await screen.findByRole('link', { name: 'Rina' })).toHaveAttribute('href', '/admin/outlets/o1/users/m1')
    expect(screen.getByText('Pajak 11% · Service 5,5%')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Role' }))
    expect(await screen.findByRole('link', { name: 'Kasir' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tambah role' })).not.toBeInTheDocument()
  })
})
