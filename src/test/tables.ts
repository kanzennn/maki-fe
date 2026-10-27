import type { components } from '@/lib/api-schema'

type Area = components['schemas']['Area']
type Table = components['schemas']['Table']
type Layout = components['schemas']['Layout']
type Schedule = components['schemas']['Schedule']

const at = '2026-10-01T03:00:00Z'

/** Maki Bandung's areas: Indoor with three tables, and an empty Teras. */
export const testIndoor: Area = { area_id: 'a-in', name: 'Indoor', sort_order: 0, table_count: 3, created_at: at, updated_at: at }
export const testTerrace: Area = { area_id: 'a-out', name: 'Teras', sort_order: 1, table_count: 0, created_at: at, updated_at: at }
export const testAreas = [testIndoor, testTerrace]

/** A table in Indoor: available, without seats given, and not placed, unless extra says otherwise. */
export function testTable(id: string, name: string, extra: Partial<Table> = {}): Table {
  return {
    table_id: id,
    area: { area_id: 'a-in', name: 'Indoor' },
    name,
    capacity: null,
    shape: 'square',
    box: null,
    rotation: 0,
    is_active: true,
    status: 'available',
    seated: null,
    created_at: at,
    updated_at: at,
    ...extra,
  }
}

export const testA1 = testTable('t-a1', 'A1', { capacity: 4, box: { x: 2, y: 2, w: 3, h: 3 } })
/** Customers seated since 12.30 WIB, two sales. */
export const testA2 = testTable('t-a2', 'A2', {
  capacity: 2,
  shape: 'round',
  box: { x: 10, y: 2, w: 3, h: 3 },
  status: 'occupied',
  seated: { since: '2026-10-05T05:30:00Z', orders: 2 },
})
/** Turned off, and not placed yet. */
export const testA3 = testTable('t-a3', 'A3', { is_active: false, status: 'inactive' })

export const testIndoorLayout: Layout = {
  area: { area_id: 'a-in', name: 'Indoor' },
  version: 4,
  decorations: [{ kind: 'wall', x: 0, y: 31, w: 48, h: 1, rotation: 0 }],
  tables: [testA1, testA2, testA3],
}

export const testTerraceLayout: Layout = {
  area: { area_id: 'a-out', name: 'Teras' },
  version: 1,
  decorations: [],
  tables: [],
}

/** A schedule taking A1 and A2 out on 10 October, 10.00 to 15.00 WIB. */
export function testSchedule(id: string, title: string, extra: Partial<Schedule> = {}): Schedule {
  return {
    schedule_id: id,
    title,
    start_at: '2026-10-10T03:00:00Z',
    end_at: '2026-10-10T08:00:00Z',
    status: 'upcoming',
    tables: [
      { table_id: 't-a1', name: 'A1', area: { area_id: 'a-in', name: 'Indoor' }, deleted: false },
      { table_id: 't-a2', name: 'A2', area: { area_id: 'a-in', name: 'Indoor' }, deleted: false },
    ],
    created_by: { user_id: 'm1', name: 'Rina' },
    cancelled_at: null,
    cancelled_by: null,
    created_at: '2026-10-05T02:00:00Z',
    updated_at: '2026-10-05T02:00:00Z',
    ...extra,
  }
}
