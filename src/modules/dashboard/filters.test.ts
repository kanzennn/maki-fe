import { describe, expect, it } from 'vitest'

import { dashboardFromUrl, ownerDashboardParams, presetPeriod, statePeriod, today } from './filters'

// 17.30 UTC on 31 October is already 1 November in Jakarta.
const now = new Date('2026-10-31T17:30:00Z')

describe('a dashboard period', () => {
  it("takes today in the zone, not the browser's", () => {
    expect(today('Asia/Jakarta', now)).toBe('2026-11-01')
    expect(today('UTC', now)).toBe('2026-10-31')
  })

  it('works the presets out back from today, today included', () => {
    expect(presetPeriod('today', 'Asia/Jakarta', now)).toEqual({ from: '2026-11-01', to: '2026-11-01' })
    expect(presetPeriod('week', 'Asia/Jakarta', now)).toEqual({ from: '2026-10-26', to: '2026-11-01' })
    expect(presetPeriod('month30', 'Asia/Jakarta', now)).toEqual({ from: '2026-10-03', to: '2026-11-01' })
    expect(presetPeriod('thisMonth', 'UTC', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })

  it('fills in a date left out', () => {
    expect(statePeriod({}, 'Asia/Jakarta', now)).toEqual({ from: '2026-11-01', to: '2026-11-01' })
    expect(statePeriod({ from: '2026-10-01' }, 'Asia/Jakarta', now)).toEqual({ from: '2026-10-01', to: '2026-11-01' })
    expect(statePeriod({ to: '2026-10-05' }, 'Asia/Jakarta', now)).toEqual({ from: '2026-10-05', to: '2026-10-05' })
  })

  it('reads the address bar, and sends the outlets picked', () => {
    expect(dashboardFromUrl({ from: 'kemarin', to: '2026-10-05', outlets: 'o1,o2' })).toEqual({
      from: undefined,
      to: '2026-10-05',
      outlets: ['o1', 'o2'],
    })
    expect(ownerDashboardParams({ from: '2026-10-01', to: '2026-10-02', outlets: ['o1', 'o2'] }, 'UTC')).toEqual({
      from: '2026-10-01',
      to: '2026-10-02',
      outlet_ids: 'o1,o2',
    })
  })
})
