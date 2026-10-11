import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { apiError, bodyOf, json, renderApp, serve } from '@/test/app'
import { listOf, testManager, testOutlet, testOutletSummary, testOwner } from '@/test/fixtures'
import { testA1, testA2, testA3, testAreas, testSchedule, testTable } from '@/test/tables'

const schedulesPath = '/admin/outlets/o1/tables/schedules'
const testA4 = testTable('t-a4', 'A4')
const terraceT1 = testTable('t-t1', 'T1', { area: { area_id: 'a-out', name: 'Teras' } })

/** Five tables, two areas, one of them deleted since. */
const office = testSchedule('s1', 'Acara kantor', {
  tables: [
    ...testSchedule('s1', '').tables,
    { table_id: 't-a3', name: 'A3', area: { area_id: 'a-in', name: 'Indoor' }, deleted: false },
    { table_id: 't-a4', name: 'A4', area: { area_id: 'a-in', name: 'Indoor' }, deleted: false },
    { table_id: 't-t9', name: 'T9', area: { area_id: 'a-out', name: 'Teras' }, deleted: true },
  ],
})
const renovation = testSchedule('s2', 'Renovasi teras', {
  status: 'cancelled',
  cancelled_at: '2026-10-06T01:00:00Z',
  cancelled_by: { user_id: 'm1', name: 'Rina' },
})

/** The API behind the schedule pages. */
function schedulesApi(extra: Parameters<typeof serve>[0] = {}) {
  return serve({
    'GET /api/v1/outlets/o1': () => json(200, testOutlet),
    'GET /api/v1/outlets/o1/areas': () => json(200, listOf(testAreas)),
    'GET /api/v1/outlets/o1/tables': () => json(200, listOf([testA1, testA2, testA3, testA4, terraceT1])),
    'GET /api/v1/outlets/o1/table-schedules': () => json(200, listOf([office, renovation])),
    'GET /api/v1/outlets/o1/table-schedules/s1': () => json(200, office),
    'GET /api/v1/outlets/o1/table-schedules/s2': () => json(200, renovation),
    ...extra,
  })
}

const main = () => within(screen.getByRole('main'))

describe('the schedule list', () => {
  it('shows each schedule with its time in the outlet’s zone, its tables and its status', async () => {
    schedulesApi()
    renderApp(schedulesPath, testManager)

    const row = (await screen.findByRole('link', { name: 'Acara kantor' })).closest('tr')!
    expect(within(row).getByRole('link', { name: 'Acara kantor' })).toHaveAttribute('href', `${schedulesPath}/s1`)
    // Twice: under the title on a phone, in its column from 640px.
    expect(within(row).getAllByText('10 Okt 2026 10.00–15.00')).toHaveLength(2)
    expect(row).toHaveTextContent('A1, A2, A3 dan 2 lainnya')
    expect(row).toHaveTextContent('Akan datang')
    expect(screen.getByRole('link', { name: 'Renovasi teras' }).closest('tr')).toHaveTextContent('Dibatalkan')
    expect(main().getByText(/Waktu dalam WIB, zona waktu outlet ini\./)).toBeInTheDocument()
    expect(main().getByRole('link', { name: 'Buat jadwal' })).toHaveAttribute('href', `${schedulesPath}/new`)
  })

  it('filters by status, from the first page again', async () => {
    const requests = schedulesApi()
    const { router } = renderApp(`${schedulesPath}?page=2`, testManager)
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Status'), 'Dibatalkan')

    await waitFor(() => expect(router.state.location.search).toEqual({ status: 'cancelled' }))
    expect(requests.some((r) => new URL(r.url).searchParams.get('status') === 'cancelled')).toBe(true)
  })

  it('says when there are none, and when none has the status', async () => {
    schedulesApi({ 'GET /api/v1/outlets/o1/table-schedules': () => json(200, listOf([])) })
    renderApp(schedulesPath, testManager)
    expect(await screen.findByText('Belum ada jadwal.')).toBeInTheDocument()
  })

  it('says none has the status filtered by', async () => {
    schedulesApi({ 'GET /api/v1/outlets/o1/table-schedules': () => json(200, listOf([])) })
    renderApp(`${schedulesPath}?status=ongoing`, testManager)
    expect(await screen.findByText('Tidak ada jadwal dengan status ini.')).toBeInTheDocument()
  })

  it('lets the Owner read them, without making one', async () => {
    schedulesApi()
    renderApp(schedulesPath, testOwner)

    expect(await screen.findByRole('link', { name: 'Acara kantor' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Buat jadwal' })).not.toBeInTheDocument()
  })
})

describe('a schedule', () => {
  it('shows its times, who made it, and its tables by area, the deleted ones marked', async () => {
    schedulesApi()
    renderApp(`${schedulesPath}/s1`, testManager)

    expect(await screen.findByRole('heading', { level: 1, name: /Acara kantor/ })).toHaveTextContent('Akan datang')
    expect(main().getByText('10 Okt 2026, 10.00 WIB')).toBeInTheDocument()
    expect(main().getByText('10 Okt 2026, 15.00 WIB')).toBeInTheDocument()
    expect(main().getByText('Rina, 5 Okt 2026, 09.00 WIB')).toBeInTheDocument()
    expect(main().getByRole('heading', { name: '5 meja' })).toBeInTheDocument()
    expect(main().getByText('A1, A2, A3, A4')).toBeInTheDocument()
    expect(main().getByText('T9 (sudah dihapus)')).toBeInTheDocument()
    expect(main().getByRole('link', { name: 'Ubah' })).toHaveAttribute('href', `${schedulesPath}/s1/edit`)
  })

  it('is cancelled, and stays as history', async () => {
    const requests = schedulesApi({
      'DELETE /api/v1/outlets/o1/table-schedules/s1': () => json(200, { ...office, status: 'cancelled' }),
    })
    renderApp(`${schedulesPath}/s1`, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Batalkan jadwal' }))
    const dialog = within(screen.getByRole('alertdialog', { name: 'Batalkan jadwal Acara kantor?' }))
    expect(dialog.getByText(/tetap tersimpan sebagai riwayat/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Batalkan jadwal' }))

    expect(await screen.findByText('Jadwal Acara kantor dibatalkan.')).toBeInTheDocument()
    expect(requests.filter((r) => r.method === 'DELETE')).toHaveLength(1)
  })

  it('says who cancelled it, and has nothing left to change', async () => {
    schedulesApi()
    renderApp(`${schedulesPath}/s2`, testManager)

    expect(await screen.findByText('Rina, 6 Okt 2026, 08.00 WIB')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ubah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Batalkan jadwal' })).not.toBeInTheDocument()
  })

  it('is only read by the Owner', async () => {
    schedulesApi()
    renderApp(`${schedulesPath}/s1`, testOwner)

    expect(await screen.findByText('A1, A2, A3, A4')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ubah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Batalkan jadwal' })).not.toBeInTheDocument()
  })
})

describe('a new schedule', () => {
  it("reads its times in the outlet's zone, and picks tables one by one or a whole area", async () => {
    const requests = schedulesApi({
      'POST /api/v1/outlets/o1/table-schedules': () => json(201, testSchedule('s-new', 'Acara kantor')),
      'GET /api/v1/outlets/o1/table-schedules/s-new': () => json(200, testSchedule('s-new', 'Acara kantor')),
    })
    const { router } = renderApp(`${schedulesPath}/new`, testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Judul atau alasan'), ' Acara kantor ')
    fireEvent.change(screen.getByLabelText('Mulai (WIB)'), { target: { value: '2026-10-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Selesai (WIB)'), { target: { value: '2026-10-10T15:00' } })
    const indoor = screen.getByRole('checkbox', { name: 'Semua meja Indoor' })
    await user.click(indoor)
    expect(screen.getByText('4 dari 4 dipilih')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'A3' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'A3' }))
    expect(indoor).toHaveAttribute('data-state', 'indeterminate')
    expect(screen.getByText('3 dari 4 dipilih')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'T1' }))
    await user.click(screen.getByRole('button', { name: 'Buat jadwal' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`${schedulesPath}/s-new`))
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/table-schedules')).toEqual({
      title: 'Acara kantor',
      start_at: '2026-10-10T03:00:00.000Z',
      end_at: '2026-10-10T08:00:00.000Z',
      table_ids: ['t-a1', 't-a2', 't-a4', 't-t1'],
      confirm_overlap: false,
    })
  })

  it('takes an area off again with its own box', async () => {
    schedulesApi()
    renderApp(`${schedulesPath}/new`, testManager)
    const user = userEvent.setup()

    const indoor = await screen.findByRole('checkbox', { name: 'Semua meja Indoor' })
    await user.click(screen.getByRole('checkbox', { name: 'A1' }))
    await user.click(indoor)
    expect(indoor).toBeChecked()
    await user.click(indoor)
    expect(screen.getByText('0 dari 4 dipilih')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'A1' })).not.toBeChecked()
  })

  it('names the schedules it overlaps, and saves anyway when asked', async () => {
    let posts = 0
    const requests = schedulesApi({
      'POST /api/v1/outlets/o1/table-schedules': () =>
        ++posts === 1
          ? apiError(409, 'schedule_overlaps', {
              schedules: [
                {
                  schedule_id: 's9',
                  title: 'Arisan',
                  start_at: '2026-10-10T05:00:00Z',
                  end_at: '2026-10-10T09:00:00Z',
                  tables: ['A1', 'A2'],
                },
              ],
            })
          : json(201, testSchedule('s-new', 'Acara kantor')),
      'GET /api/v1/outlets/o1/table-schedules/s-new': () => json(200, testSchedule('s-new', 'Acara kantor')),
    })
    const { router } = renderApp(`${schedulesPath}/new`, testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Judul atau alasan'), 'Acara kantor')
    fireEvent.change(screen.getByLabelText('Mulai (WIB)'), { target: { value: '2026-10-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Selesai (WIB)'), { target: { value: '2026-10-10T15:00' } })
    await user.click(screen.getByRole('checkbox', { name: 'Semua meja Indoor' }))
    await user.click(screen.getByRole('button', { name: 'Buat jadwal' }))

    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent('Bentrok dengan jadwal lain di meja yang sama:')
    expect(warning).toHaveTextContent('Arisan, 10 Okt 2026 12.00–16.00: meja A1, A2')
    expect(screen.queryByRole('button', { name: 'Buat jadwal' })).not.toBeInTheDocument()
    await user.click(within(warning).getByRole('button', { name: 'Simpan tetap' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`${schedulesPath}/s-new`))
    const sent = requests.filter((r) => r.method === 'POST')
    expect(sent).toHaveLength(2)
    expect(await sent[1].json()).toMatchObject({ table_ids: ['t-a1', 't-a2', 't-a3', 't-a4'], confirm_overlap: true })
  })

  it('lets the warning go to change the schedule first', async () => {
    schedulesApi({
      'POST /api/v1/outlets/o1/table-schedules': () => apiError(409, 'schedule_overlaps', { schedules: [] }),
    })
    renderApp(`${schedulesPath}/new`, testManager)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Judul atau alasan'), 'Acara kantor')
    fireEvent.change(screen.getByLabelText('Mulai (WIB)'), { target: { value: '2026-10-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Selesai (WIB)'), { target: { value: '2026-10-10T15:00' } })
    await user.click(screen.getByRole('checkbox', { name: 'A1' }))
    await user.click(screen.getByRole('button', { name: 'Buat jadwal' }))
    await user.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Periksa lagi' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buat jadwal' })).toBeInTheDocument()
  })

  it('needs every field, an end after its start, and a start from now on', async () => {
    const requests = schedulesApi({
      'POST /api/v1/outlets/o1/table-schedules': () =>
        apiError(422, 'validation_failed', { fields: { start_at: 'future' } }),
    })
    renderApp(`${schedulesPath}/new`, testManager)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Buat jadwal' }))
    expect(screen.getByLabelText('Judul atau alasan')).toHaveAccessibleDescription(/^Wajib diisi\./)
    expect(screen.getByLabelText('Mulai (WIB)')).toHaveAccessibleDescription('Wajib diisi.')
    expect(screen.getByLabelText('Selesai (WIB)')).toHaveAccessibleDescription('Wajib diisi.')
    expect(screen.getByRole('group', { name: 'Meja' })).toHaveAccessibleDescription('Wajib diisi.')

    await user.type(screen.getByLabelText('Judul atau alasan'), 'Acara kantor')
    fireEvent.change(screen.getByLabelText('Mulai (WIB)'), { target: { value: '2026-10-10T15:00' } })
    fireEvent.change(screen.getByLabelText('Selesai (WIB)'), { target: { value: '2026-10-10T15:00' } })
    await user.click(screen.getByRole('checkbox', { name: 'A1' }))
    await user.click(screen.getByRole('button', { name: 'Buat jadwal' }))
    expect(screen.getByLabelText('Selesai (WIB)')).toHaveAccessibleDescription('Harus setelah waktu mulai.')
    expect(requests.some((r) => r.method === 'POST')).toBe(false)

    fireEvent.change(screen.getByLabelText('Selesai (WIB)'), { target: { value: '2026-10-10T18:00' } })
    await user.click(screen.getByRole('button', { name: 'Buat jadwal' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Mulai (WIB)')).toHaveAccessibleDescription('Mulai tidak boleh sebelum sekarang.'),
    )
  })

  it("follows an outlet's own zone", async () => {
    const requests = schedulesApi({
      'POST /api/v1/outlets/o1/table-schedules': () => json(201, testSchedule('s-new', 'Acara')),
      'GET /api/v1/outlets/o1/table-schedules/s-new': () => json(200, testSchedule('s-new', 'Acara')),
    })
    const jayapura = { ...testManager, outlet: { ...testOutletSummary, timezone: 'Asia/Jayapura' } }
    renderApp(`${schedulesPath}/new`, jayapura)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Judul atau alasan'), 'Acara')
    expect(screen.getByText(/^Diisi dalam WIT \(Asia\/Jayapura\)/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Mulai (WIT)'), { target: { value: '2026-10-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Selesai (WIT)'), { target: { value: '2026-10-11T01:30' } })
    await user.click(screen.getByRole('checkbox', { name: 'T1' }))
    await user.click(screen.getByRole('button', { name: 'Buat jadwal' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(await bodyOf(requests, 'POST', '/api/v1/outlets/o1/table-schedules')).toMatchObject({
      start_at: '2026-10-10T01:00:00.000Z',
      end_at: '2026-10-10T16:30:00.000Z',
    })
  })

  it('is for whoever manages tables', async () => {
    schedulesApi()
    const { router } = renderApp(`${schedulesPath}/new`, testOwner)
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })
})

describe('a change to a schedule', () => {
  it("starts from its times in the outlet's zone and its tables still there", async () => {
    const ongoing = { ...office, status: 'ongoing' as const }
    const requests = schedulesApi({
      'GET /api/v1/outlets/o1/table-schedules/s1': () => json(200, ongoing),
      'PUT /api/v1/outlets/o1/table-schedules/s1': () => json(200, ongoing),
    })
    const { router } = renderApp(`${schedulesPath}/s1/edit`, testManager)
    const user = userEvent.setup()

    expect(await screen.findByText(/^Jadwal ini sedang berlangsung/)).toBeInTheDocument()
    expect(screen.getByLabelText('Judul atau alasan')).toHaveValue('Acara kantor')
    expect(screen.getByLabelText('Mulai (WIB)')).toHaveValue('2026-10-10T10:00')
    expect(screen.getByLabelText('Selesai (WIB)')).toHaveValue('2026-10-10T15:00')
    expect(screen.getByRole('checkbox', { name: 'A1' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'A3' })).toBeChecked()
    fireEvent.change(screen.getByLabelText('Selesai (WIB)'), { target: { value: '2026-10-10T17:00' } })
    await user.click(screen.getByRole('button', { name: 'Simpan jadwal' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`${schedulesPath}/s1`))
    // T9 was deleted since: it can't stay on it.
    expect(await bodyOf(requests, 'PUT', '/api/v1/outlets/o1/table-schedules/s1')).toEqual({
      title: 'Acara kantor',
      start_at: '2026-10-10T03:00:00.000Z',
      end_at: '2026-10-10T10:00:00.000Z',
      table_ids: ['t-a1', 't-a2', 't-a3', 't-a4'],
      confirm_overlap: false,
    })
  })

  it('is not offered once the schedule is over', async () => {
    schedulesApi()
    renderApp(`${schedulesPath}/s2/edit`, testManager)

    expect(
      await screen.findByText('Jadwal ini sudah selesai atau dibatalkan, jadi tidak bisa diubah lagi.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simpan jadwal' })).not.toBeInTheDocument()
  })
})
