import { describe, expect, it } from 'vitest'

import { logListFromUrl, outletLogParams, ownerLogParams } from './filters'

describe('the log list state', () => {
  it('reads the address bar, leaving out what makes no sense', () => {
    expect(logListFromUrl({ from: '2026-10-01', to: 'kemarin', actions: 'menu.created,menu.updated', self: true, page: 3 })).toEqual({
      from: '2026-10-01',
      to: undefined,
      actions: ['menu.created', 'menu.updated'],
      outlet: undefined,
      self: true,
      user: undefined,
      page: 3,
    })
    expect(logListFromUrl({ self: 'maybe', page: 0 })).toMatchObject({ self: undefined, page: undefined })
    // As the router keeps them after a filter.
    expect(logListFromUrl({ actions: ['menu.created', 1, ''] }).actions).toEqual(['menu.created'])
  })

  it("turns dates into instants of the zone, the last day whole", () => {
    expect(ownerLogParams({ from: '2026-10-01', to: '2026-10-01', actions: ['a.b', 'c.d'], outlet: 'o1', self: true }, 'Asia/Jakarta')).toEqual({
      from: '2026-09-30T17:00:00.000Z',
      to: '2026-10-01T17:00:00.000Z',
      action: 'a.b,c.d',
      outlet_ids: 'o1',
      self: true,
      page: undefined,
    })
    expect(outletLogParams({ to: '2026-12-31', user: 'k1' }, 'Asia/Jayapura')).toMatchObject({
      to: '2026-12-31T15:00:00.000Z',
      user_id: 'k1',
    })
  })
})
