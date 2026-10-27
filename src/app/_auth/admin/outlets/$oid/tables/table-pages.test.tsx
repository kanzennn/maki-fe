import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { components } from '@/lib/api-schema'
import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testOutlet, testOwner } from '@/test/fixtures'
import {
  testA1,
  testA2,
  testA3,
  testAreas,
  testIndoorLayout,
  testTable,
  testTerrace,
  testTerraceLayout,
} from '@/test/tables'

type Area = components['schemas']['Area']
type Layout = components['schemas']['Layout']

const tablesPath = '/admin/outlets/o1/tables'
const editorPath = '/admin/outlets/o1/tables/layout/a-in'

/** The API behind the tables pages. */
function tablesApi(extra: Parameters<typeof serve>[0] = {}) {
  return serve({
    'GET /api/v1/outlets/o1': () => json(200, testOutlet),
    'GET /api/v1/outlets/o1/areas': () => json(200, listOf(testAreas)),
    'GET /api/v1/outlets/o1/areas/a-in/layout': () => json(200, testIndoorLayout),
    'GET /api/v1/outlets/o1/areas/a-out/layout': () => json(200, testTerraceLayout),
    'GET /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'table' }),
    ...extra,
  })
}

const main = () => within(screen.getByRole('main'))
/** A table in the area's list, by its name. */
const row = async (name: string) =>
  (await within(await screen.findByRole('list', { name: /^Meja di / })).findByText(name, { exact: true })).closest('li')!

describe('the tables page', () => {
  it("shows the first area's layout and its tables with their statuses, in words", async () => {
    tablesApi()
    renderApp(tablesPath, testManager)

    expect(await screen.findByRole('heading', { level: 1, name: 'Meja' })).toBeInTheDocument()
    const areas = within(screen.getByRole('navigation', { name: 'Area' }))
    expect(areas.getByRole('link', { name: 'Indoor, 3 meja' })).toHaveAttribute('aria-current', 'page')
    expect(areas.getByRole('link', { name: 'Teras, 0 meja' })).not.toHaveAttribute('aria-current')
    expect(main().getByRole('img', { name: 'Layout area Indoor' })).toBeInTheDocument()
    expect(main().getByText('Belum ditempatkan di layout:')).toBeInTheDocument()

    expect(await row('A1')).toHaveTextContent('4 kursi')
    expect(await row('A1')).toHaveTextContent('Persegi')
    expect(await row('A1')).toHaveTextContent('Tersedia')
    expect(await row('A2')).toHaveTextContent('Bulat')
    expect(await row('A2')).toHaveTextContent('Terisi')
    expect(await row('A2')).toHaveTextContent('Sejak 12.30 · 2 transaksi')
    expect(await row('A3')).toHaveTextContent('Belum ditempatkan di layout')
    expect(await row('A3')).toHaveTextContent('Tidak diisi')
    expect(await row('A3')).toHaveTextContent('Nonaktif')

    expect(main().getByRole('link', { name: 'Jadwal meja' })).toHaveAttribute('href', '/admin/outlets/o1/tables/schedules')
    expect(main().getByRole('link', { name: 'Kelola area' })).toHaveAttribute('href', '/admin/outlets/o1/tables/areas')
    expect(main().getByRole('link', { name: 'Atur layout' })).toHaveAttribute('href', editorPath)
  })

  it('opens the area the address names', async () => {
    const requests = tablesApi()
    renderApp(`${tablesPath}?area=a-out`, testManager)

    expect(await screen.findByText('Belum ada meja di area ini.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Teras, 0 meja' })).toHaveAttribute('aria-current', 'page')
    expect(requests.some((r) => new URL(r.url).pathname.endsWith('/areas/a-in/layout'))).toBe(false)
  })

  it('says a table goes off once released when customers are seated there', async () => {
    const requests = tablesApi({
      'PATCH /api/v1/outlets/o1/tables/t-a2/status': () => json(200, { ...testA2, is_active: false }),
    })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    await user.click(within(await row('A2')).getByRole('button', { name: 'Nonaktifkan' }))
    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText(/baru berlaku setelah kasir menekan Kosongkan Meja/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Nonaktifkan' }))

    expect(await screen.findByText('Meja A2 dinonaktifkan.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PATCH', '/api/v1/outlets/o1/tables/t-a2/status')).toEqual({ is_active: false })
  })

  it("won't delete a table customers are seated at, and says so when a sale seated them meanwhile", async () => {
    tablesApi({
      'DELETE /api/v1/outlets/o1/tables/t-a1': () => apiError(409, 'table_occupied'),
    })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    await user.click(within(await row('A2')).getByRole('button', { name: 'Hapus' }))
    let dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Meja ini sedang terisi, jadi belum bisa dihapus.')
    expect(within(dialog).queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    await user.click(within(await row('A1')).getByRole('button', { name: 'Hapus' }))
    dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Transaksi yang pernah memakainya tetap menyimpan namanya.')
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(dialog).toHaveTextContent('Meja ini sedang terisi, jadi belum bisa dihapus.'))
    expect(within(dialog).queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('deletes a table no one is seated at', async () => {
    tablesApi({ 'DELETE /api/v1/outlets/o1/tables/t-a1': () => new Response(null, { status: 204 }) })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    await user.click(within(await row('A1')).getByRole('button', { name: 'Hapus' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Hapus' }))
    expect(await screen.findByText('Meja A1 dihapus.')).toBeInTheDocument()
  })

  it("shows the Owner an outlet's tables under its tabs, without changing them", async () => {
    tablesApi()
    renderApp(tablesPath, testOwner)

    expect(await screen.findByRole('heading', { level: 2, name: 'Meja' })).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Bagian outlet' })
    expect(within(tabs).getByRole('link', { name: 'Meja' })).toHaveAttribute('aria-current', 'page')
    expect(await row('A2')).toHaveTextContent('Terisi')
    expect(main().getByRole('link', { name: 'Jadwal meja' })).toBeInTheDocument()
    expect(main().queryByRole('button', { name: 'Tambah meja' })).not.toBeInTheDocument()
    expect(main().queryByRole('link', { name: 'Atur layout' })).not.toBeInTheDocument()
    expect(main().queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument()
    expect(main().queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('asks for an area first when the outlet has none', async () => {
    tablesApi({ 'GET /api/v1/outlets/o1/areas': () => json(200, listOf([])) })
    renderApp(tablesPath, testManager)

    expect(await screen.findByText(/^Belum ada area\. Buat area dulu/)).toBeInTheDocument()
    expect(main().getAllByRole('link', { name: 'Kelola area' })).toHaveLength(2)
    expect(main().queryByRole('button', { name: 'Tambah meja' })).not.toBeInTheDocument()
  })

  it('tells the Owner an outlet has no areas', async () => {
    tablesApi({ 'GET /api/v1/outlets/o1/areas': () => json(200, listOf([])) })
    renderApp(tablesPath, testOwner)

    expect(await screen.findByText('Outlet ini belum punya area meja.')).toBeInTheDocument()
  })
})

describe('the dine-in mode', () => {
  const card = async () => within(await screen.findByRole('region', { name: 'Mode dine-in' }))

  it('is changed by the Manager, once told what changes at the cashier', async () => {
    const requests = tablesApi({ 'PUT /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'number' }) })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    const mode = await card()
    expect(mode.getByRole('radio', { name: 'Meja' })).toBeChecked()
    expect(mode.getByRole('button', { name: 'Simpan mode' })).toBeDisabled()
    expect(main().queryByText(/^Outlet ini memakai Mode Nomor/)).not.toBeInTheDocument()

    await user.click(mode.getByRole('radio', { name: 'Nomor papan' }))
    await user.click(mode.getByRole('button', { name: 'Simpan mode' }))
    const dialog = within(screen.getByRole('alertdialog', { name: 'Pakai Mode Nomor?' }))
    expect(dialog.getByText(/kasir mengetik nomor papan untuk setiap pesanan dine-in/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Ganti mode' }))

    expect(await screen.findByText('Outlet ini sekarang memakai Mode Nomor.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/dine-in-mode')).toEqual({ mode: 'number' })
    expect(mode.getByRole('button', { name: 'Simpan mode' })).toBeDisabled()
    // The tables stay, under a word that the cashier doesn't pick them now.
    expect(main().getByText(/^Outlet ini memakai Mode Nomor: kasir mengetik nomor papan/)).toBeInTheDocument()
    expect(await row('A1')).toBeInTheDocument()
  })

  it('goes back to tables the same way', async () => {
    const requests = tablesApi({
      'GET /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'number' }),
      'PUT /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'table' }),
    })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    const mode = await card()
    expect(mode.getByRole('radio', { name: 'Nomor papan' })).toBeChecked()
    expect(main().getByText(/^Outlet ini memakai Mode Nomor/)).toBeInTheDocument()
    await user.click(mode.getByRole('radio', { name: 'Meja' }))
    await user.click(mode.getByRole('button', { name: 'Simpan mode' }))
    const dialog = within(screen.getByRole('alertdialog', { name: 'Pakai Mode Meja?' }))
    expect(dialog.getByText(/kasir memilih meja dari layout untuk pesanan dine-in/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Ganti mode' }))

    expect(await screen.findByText('Outlet ini sekarang memakai Mode Meja.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/dine-in-mode')).toEqual({ mode: 'table' })
    expect(main().queryByText(/^Outlet ini memakai Mode Nomor/)).not.toBeInTheDocument()
  })

  it.each([
    ['the Owner', testOwner],
    ['whoever only reads tables', { ...testManager, permissions: ['table.view'] }],
  ])('is shown to %s, without a way to change it', async (_, who) => {
    tablesApi({ 'GET /api/v1/outlets/o1/dine-in-mode': () => json(200, { mode: 'number' }) })
    renderApp(tablesPath, who)

    const mode = await card()
    expect(mode.getByRole('radio', { name: 'Nomor papan' })).toBeChecked()
    expect(mode.getByRole('radio', { name: 'Meja' })).toBeDisabled()
    expect(mode.queryByRole('button', { name: 'Simpan mode' })).not.toBeInTheDocument()
    expect(main().getByText(/^Outlet ini memakai Mode Nomor/)).toBeInTheDocument()
  })
})

describe('a table', () => {
  it('is added to the area shown, with its seats and shape', async () => {
    const requests = tablesApi({
      'POST /api/v1/outlets/o1/tables': () => json(201, testTable('t-a4', 'A4')),
    })
    renderApp(`${tablesPath}?area=a-out`, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tambah meja' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Tambah meja' }))
    expect(dialog.getByLabelText('Area')).toHaveValue('a-out')
    await user.type(dialog.getByLabelText('Nama meja'), ' T1 ')
    await user.type(dialog.getByLabelText('Kapasitas kursi'), '6')
    await user.click(dialog.getByLabelText('Persegi panjang'))
    await user.click(dialog.getByRole('button', { name: 'Tambah meja' }))

    expect(await screen.findByText('Meja T1 ditambahkan. Tempatkan di layout lewat Atur layout.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/tables')).toEqual({
      name: 'T1',
      area_id: 'a-out',
      capacity: 6,
      shape: 'rectangle',
      is_active: true,
    })
  })

  it('needs a name, takes 1 to 99 seats, and shows a taken name on its field', async () => {
    const requests = tablesApi({
      'POST /api/v1/outlets/o1/tables': () => apiError(409, 'table_name_taken'),
    })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tambah meja' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Kapasitas kursi'), '0')
    await user.click(dialog.getByRole('button', { name: 'Tambah meja' }))
    expect(dialog.getByLabelText('Nama meja')).toHaveAccessibleDescription(/^Wajib diisi\./)
    expect(dialog.getByLabelText('Kapasitas kursi')).toHaveAccessibleDescription(/^Angkanya di luar batas\./)
    expect(requests.some((r) => r.method === 'POST')).toBe(false)

    await user.type(dialog.getByLabelText('Nama meja'), 'A1')
    await user.clear(dialog.getByLabelText('Kapasitas kursi'))
    await user.click(dialog.getByRole('button', { name: 'Tambah meja' }))
    await waitFor(() =>
      expect(dialog.getByLabelText('Nama meja')).toHaveAccessibleDescription(
        /^Nama ini sudah dipakai meja lain di outlet ini\./,
      ),
    )
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/tables')).toMatchObject({ name: 'A1', capacity: null })
  })

  it('is changed, and moving it to another area says it leaves the layout', async () => {
    const requests = tablesApi({
      'PUT /api/v1/outlets/o1/tables/t-a1': () => json(200, testA1),
    })
    renderApp(tablesPath, testManager)
    const user = userEvent.setup()

    await user.click(within(await row('A1')).getByRole('button', { name: 'Ubah' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Ubah meja A1' }))
    expect(dialog.getByText(/mengeluarkan meja dari layout area lamanya/)).toBeInTheDocument()
    expect(dialog.getByLabelText('Kapasitas kursi')).toHaveValue('4')
    // Turned on and off from the list, not here.
    expect(dialog.queryByLabelText('Aktif: bisa dipilih di kasir')).not.toBeInTheDocument()
    await user.selectOptions(dialog.getByLabelText('Area'), 'Teras')
    await user.click(dialog.getByRole('button', { name: 'Simpan meja' }))

    expect(await screen.findByText('Perubahan meja A1 disimpan.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/tables/t-a1')).toEqual({
      name: 'A1',
      area_id: 'a-out',
      capacity: 4,
      shape: 'square',
      is_active: true,
    })
  })
})

describe('the areas', () => {
  it('moves an area a step at a time, says so, and keeps the focus on it', async () => {
    let order: Area[] = testAreas
    const requests = tablesApi({
      'GET /api/v1/outlets/o1/areas': () => json(200, listOf(order)),
      'PUT /api/v1/outlets/o1/areas/order': async (request) => {
        const { area_ids: ids } = (await request.json()) as { area_ids: string[] }
        order = ids.map((id, index) => ({ ...testAreas.find((a) => a.area_id === id)!, sort_order: index }))
        return json(200, listOf(order))
      },
    })
    renderApp('/admin/outlets/o1/tables/areas', testManager)
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Naikkan Indoor' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Naikkan Teras' }))

    expect(await screen.findByText('Teras sekarang di urutan 1.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/areas/order')).toEqual({ area_ids: ['a-out', 'a-in'] })
    const items = within(main().getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/^(Indoor|Teras)$/).textContent)).toEqual(['Teras', 'Indoor'])
    expect(screen.getByRole('button', { name: 'Turunkan Teras' })).toHaveFocus()
  })

  it('goes back to the order it had when the server refuses the move', async () => {
    tablesApi({ 'PUT /api/v1/outlets/o1/areas/order': () => apiError(409, 'areas_changed') })
    renderApp('/admin/outlets/o1/tables/areas', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Naikkan Teras' }))

    expect(await screen.findByText(/^Daftar area baru saja berubah/)).toBeInTheDocument()
    const items = within(main().getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/^(Indoor|Teras)$/).textContent)).toEqual(['Indoor', 'Teras'])
  })

  it('creates an area, and shows a taken name on its field', async () => {
    let taken = true
    const requests = tablesApi({
      'POST /api/v1/outlets/o1/areas': () =>
        taken ? apiError(409, 'area_name_taken') : json(201, { ...testTerrace, area_id: 'a-2', name: 'Lantai 2' }),
    })
    renderApp('/admin/outlets/o1/tables/areas', testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tambah area' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Tambah area' }))
    await user.type(dialog.getByLabelText('Nama area'), 'indoor')
    await user.click(dialog.getByRole('button', { name: 'Tambah area' }))
    await waitFor(() =>
      expect(dialog.getByLabelText('Nama area')).toHaveAccessibleDescription(/^Nama ini sudah dipakai area lain/),
    )

    taken = false
    await user.clear(dialog.getByLabelText('Nama area'))
    await user.type(dialog.getByLabelText('Nama area'), 'Lantai 2 ')
    await user.click(dialog.getByRole('button', { name: 'Tambah area' }))
    expect(await screen.findByText('Area Lantai 2 dibuat.')).toBeInTheDocument()
    const posts = requests.filter((r) => r.method === 'POST')
    expect(await posts[1].json()).toEqual({ name: 'Lantai 2' })
  })

  it('renames an area', async () => {
    const requests = tablesApi({
      'PUT /api/v1/outlets/o1/areas/a-out': () => json(200, { ...testTerrace, name: 'Outdoor' }),
    })
    renderApp('/admin/outlets/o1/tables/areas', testManager)
    const user = userEvent.setup()

    const terrace = (await screen.findByText('Teras')).closest('li')!
    await user.click(within(terrace).getByRole('button', { name: 'Ganti nama' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Ganti nama Teras' }))
    await user.clear(dialog.getByLabelText('Nama area'))
    await user.type(dialog.getByLabelText('Nama area'), 'Outdoor')
    await user.click(dialog.getByRole('button', { name: 'Simpan nama' }))

    expect(await screen.findByText('Nama area diganti menjadi Outdoor.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/areas/a-out')).toEqual({ name: 'Outdoor' })
  })

  it('says how many tables an area still holds instead of deleting it, the server too', async () => {
    tablesApi({ 'DELETE /api/v1/outlets/o1/areas/a-out': () => apiError(409, 'area_not_empty', { tables: 2 }) })
    renderApp('/admin/outlets/o1/tables/areas', testManager)
    const user = userEvent.setup()

    const indoor = (await screen.findByText('Indoor')).closest('li')!
    expect(indoor).toHaveTextContent('3 meja')
    await user.click(within(indoor).getByRole('button', { name: 'Hapus' }))
    let dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Area ini masih berisi 3 meja.')
    expect(within(dialog).queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    // Empty when the list was read; a table joined it since.
    const terrace = screen.getByText('Teras').closest('li')!
    await user.click(within(terrace).getByRole('button', { name: 'Hapus' }))
    dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(dialog).toHaveTextContent('Area ini masih berisi 2 meja.'))
    expect(within(dialog).queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('shows the Owner the order without a way to change it', async () => {
    tablesApi()
    renderApp('/admin/outlets/o1/tables/areas', testOwner)

    expect(await screen.findByText('Teras')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Naikkan Teras' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tambah area' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })
})

/** A table or decoration on the editor's canvas, by its name: "Meja A1", "Pintu". */
const onCanvas = (name: string) => within(screen.getByRole('group', { name: 'Layout area Indoor' })).queryByRole('button', { name: new RegExp(`^${name},`) })

describe('the layout editor', () => {
  it('places a table, moves, resizes and turns it by keyboard, and saves the whole layout', async () => {
    const saved: Layout = {
      ...testIndoorLayout,
      version: 5,
      tables: [testA1, testA2, { ...testA3, box: { x: 6, y: 0, w: 4, h: 3 }, rotation: 90 }],
    }
    const requests = tablesApi({ 'PUT /api/v1/outlets/o1/areas/a-in/layout': () => json(200, saved) })
    renderApp(editorPath, testManager)
    const user = userEvent.setup()

    expect(await screen.findByRole('heading', { level: 1, name: 'Atur layout Indoor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Tempatkan meja A3' }))

    // In the first spot free of the others, and focused there.
    expect(onCanvas('Meja A3')).toHaveAccessibleName('Meja A3, x 5, y 0, 3 × 3 kotak')
    await waitFor(() => expect(onCanvas('Meja A3')).toHaveFocus())
    expect(screen.getByText('Semua meja area ini sudah di layout.')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await user.keyboard('r')
    expect(onCanvas('Meja A3')).toHaveAccessibleName('Meja A3, x 6, y 0, 4 × 3 kotak')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Meja A3, x 6, y 0, 4 × 3 kotak')
    expect(screen.getByLabelText('Rotasi')).toHaveValue('90')
    expect(screen.getByText('Ada perubahan yang belum disimpan.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Simpan layout' }))
    expect(await screen.findByText('Layout disimpan. Kasir melihat layout ini mulai sekarang.')).toBeInTheDocument()
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/areas/a-in/layout')).toEqual({
      version: 4,
      tables: [
        { table_id: 't-a1', x: 2, y: 2, w: 3, h: 3, rotation: 0, shape: 'square' },
        { table_id: 't-a2', x: 10, y: 2, w: 3, h: 3, rotation: 0, shape: 'round' },
        { table_id: 't-a3', x: 6, y: 0, w: 4, h: 3, rotation: 90, shape: 'square' },
      ],
      decorations: [{ kind: 'wall', x: 0, y: 31, w: 48, h: 1, rotation: 0 }],
    })
    expect(screen.queryByText('Ada perubahan yang belum disimpan.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()
  })

  it('holds the save while tables are on top of one another, and sets a box by its properties', async () => {
    tablesApi()
    renderApp(editorPath, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tempatkan meja A3' }))
    await user.click(onCanvas('Meja A1')!)
    expect(screen.getByRole('heading', { name: 'Meja A1' })).toBeInTheDocument()
    const x = screen.getByLabelText('X (kolom)')
    await user.clear(x)
    await user.type(x, '9')
    expect(onCanvas('Meja A1')).toHaveAccessibleName('Meja A1, x 9, y 2, 3 × 3 kotak')
    expect(screen.getByRole('alert')).toHaveTextContent('Meja A1, A2 bertumpuk. Geser salah satunya sebelum menyimpan.')
    expect(screen.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()

    await user.clear(x)
    await user.type(x, '20')
    await user.selectOptions(screen.getByLabelText('Bentuk'), 'Persegi panjang')
    expect(onCanvas('Meja A1')).toHaveAccessibleName('Meja A1, x 20, y 2, 5 × 3 kotak')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan layout' })).toBeEnabled()
    // Emptied, it waits, and shows the box again once left.
    await user.clear(x)
    await user.tab()
    expect(x).toHaveValue(20)
    expect(onCanvas('Meja A1')).toHaveAccessibleName('Meja A1, x 20, y 2, 5 × 3 kotak')
    // Past the grid, it stops at its edge.
    await user.clear(x)
    await user.type(x, '60')
    await user.tab()
    expect(x).toHaveValue(43)
    expect(onCanvas('Meja A1')).toHaveAccessibleName('Meja A1, x 43, y 2, 5 × 3 kotak')
  })

  it('adds decorations, and takes a table or a decoration off with Delete', async () => {
    tablesApi()
    renderApp(editorPath, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tambah Pintu' }))
    await waitFor(() => expect(onCanvas('Pintu')).toHaveFocus())
    expect(onCanvas('Pintu')).toHaveAccessibleName('Pintu, x 0, y 0, 3 × 1 kotak')
    await user.keyboard('{Delete}')
    expect(onCanvas('Pintu')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Pintu dihapus dari layout.')

    await user.click(onCanvas('Meja A1')!)
    await user.keyboard('{Delete}')
    expect(onCanvas('Meja A1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tempatkan meja A1' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Meja A1 dikeluarkan dari layout.')
  })

  it('discards the changes, back to the layout saved', async () => {
    tablesApi()
    renderApp(editorPath, testManager)
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Batalkan perubahan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Tempatkan meja A3' }))
    await user.click(screen.getByRole('button', { name: 'Batalkan perubahan' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Batalkan perubahan' }))

    expect(await screen.findByRole('button', { name: 'Tempatkan meja A3' })).toBeInTheDocument()
    expect(onCanvas('Meja A3')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()
  })

  it('says when the layout changed since it was opened, and starts again from the latest', async () => {
    let layout = testIndoorLayout
    tablesApi({
      'GET /api/v1/outlets/o1/areas/a-in/layout': () => json(200, layout),
      'PUT /api/v1/outlets/o1/areas/a-in/layout': () => apiError(409, 'layout_changed', { version: 6 }),
    })
    renderApp(editorPath, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tempatkan meja A3' }))
    await user.click(screen.getByRole('button', { name: 'Simpan layout' }))
    expect(await screen.findByText(/^Layout atau meja di area ini berubah sejak editor dibuka\./)).toBeInTheDocument()

    layout = { ...testIndoorLayout, version: 6, tables: [testA1, testA2, { ...testA3, box: { x: 30, y: 10, w: 3, h: 3 } }] }
    await user.click(screen.getByRole('button', { name: 'Muat ulang layout' }))
    expect(await screen.findByText('Layout terbaru sudah dimuat. Perubahan Anda sebelumnya tidak disimpan.')).toBeInTheDocument()
    expect(onCanvas('Meja A3')).toHaveAccessibleName('Meja A3, x 30, y 10, 3 × 3 kotak')
    expect(screen.getByRole('button', { name: 'Simpan layout' })).toBeDisabled()
  })

  it('asks before leaving with changes unsaved', async () => {
    tablesApi()
    const { router } = renderApp(editorPath, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Tempatkan meja A3' }))
    await user.click(screen.getByRole('link', { name: 'Kembali ke Meja' }))
    let dialog = await screen.findByRole('alertdialog', { name: 'Tinggalkan layout editor?' })
    await user.click(within(dialog).getByRole('button', { name: 'Tetap di sini' }))
    expect(router.state.location.pathname).toBe(editorPath)
    expect(onCanvas('Meja A3')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Kembali ke Meja' }))
    dialog = await screen.findByRole('alertdialog', { name: 'Tinggalkan layout editor?' })
    await user.click(within(dialog).getByRole('button', { name: 'Tinggalkan' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(tablesPath))
    expect(router.state.location.search).toEqual({ area: 'a-in' })
  })

  it('leaves without asking when nothing changed', async () => {
    tablesApi()
    const { router } = renderApp(editorPath, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Kembali ke Meja' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(tablesPath))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('says it needs a wide screen', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    tablesApi()
    renderApp(editorPath, testManager)

    expect(await screen.findByText(/^Layout editor butuh layar selebar 840 px atau lebih\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simpan layout' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Layout area Indoor' })).not.toBeInTheDocument()
  })

  it('is for whoever manages tables', async () => {
    tablesApi()
    const { router } = renderApp(editorPath, testOwner)

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })
})
