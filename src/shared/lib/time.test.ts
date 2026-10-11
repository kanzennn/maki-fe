import { describe, expect, it } from 'vitest'

import { formatDate, formatDateTimeRange, fromZonedInput, toZonedInput, zoneName } from './time'

describe('formatDate', () => {
  it('follows the language', () => {
    expect(formatDate('2026-09-25T03:00:00Z', 'id', 'Asia/Jakarta')).toBe('25 Sep 2026')
    expect(formatDate('2026-09-25T03:00:00Z', 'en', 'Asia/Jakarta')).toBe('Sep 25, 2026')
  })

  it('uses the outlet time zone, not the browser one', () => {
    // 20:00 UTC on 25 September is already 26 September in Jakarta (UTC+7)
    // and still 25 September in UTC.
    expect(formatDate('2026-09-25T20:00:00Z', 'id', 'Asia/Jakarta')).toBe('26 Sep 2026')
    expect(formatDate('2026-09-25T20:00:00Z', 'id', 'UTC')).toBe('25 Sep 2026')
  })
})

describe('formatDateTimeRange', () => {
  it('writes a day they share once, in the zone', () => {
    expect(formatDateTimeRange('2026-10-05T07:00:00Z', '2026-10-05T11:00:00Z', 'id', 'Asia/Jakarta')).toBe(
      '5 Okt 2026 14.00–18.00',
    )
    // Past midnight in Jayapura (UTC+9): both days, around a dash between thin spaces.
    expect(formatDateTimeRange('2026-10-05T07:00:00Z', '2026-10-05T15:30:00Z', 'id', 'Asia/Jayapura')).toBe(
      '5 Okt 2026, 16.00\u2009\u2013\u20096 Okt 2026, 00.30',
    )
  })
})

describe('a datetime-local field in a zone', () => {
  it("shows an instant in the zone's wall time, whatever the browser's", () => {
    expect(toZonedInput('2026-10-05T07:30:00Z', 'Asia/Jakarta')).toBe('2026-10-05T14:30')
    expect(toZonedInput('2026-10-05T07:30:00Z', 'Asia/Jayapura')).toBe('2026-10-05T16:30')
    expect(toZonedInput('2026-10-05T07:30:00Z', 'UTC')).toBe('2026-10-05T07:30')
    // Past midnight there already.
    expect(toZonedInput('2026-10-05T20:00:00Z', 'Asia/Makassar')).toBe('2026-10-06T04:00')
  })

  it("reads a wall time in the zone as its instant", () => {
    expect(fromZonedInput('2026-10-05T14:30', 'Asia/Jakarta')).toBe('2026-10-05T07:30:00.000Z')
    expect(fromZonedInput('2026-10-05T14:30', 'Asia/Jayapura')).toBe('2026-10-05T05:30:00.000Z')
    expect(fromZonedInput('2026-10-06T00:15', 'Asia/Makassar')).toBe('2026-10-05T16:15:00.000Z')
  })

  it('follows a zone that changes its clocks', () => {
    // Berlin is UTC+2 in summer and UTC+1 in winter.
    expect(fromZonedInput('2026-07-01T12:00', 'Europe/Berlin')).toBe('2026-07-01T10:00:00.000Z')
    expect(fromZonedInput('2026-12-01T12:00', 'Europe/Berlin')).toBe('2026-12-01T11:00:00.000Z')
    expect(toZonedInput('2026-07-01T10:00:00Z', 'Europe/Berlin')).toBe('2026-07-01T12:00')
    // 02:30 on 29 March 2026 doesn't happen there: clocks go from 02:00 to 03:00.
    expect(fromZonedInput('2026-03-29T02:30', 'Europe/Berlin')).toBe('2026-03-29T01:30:00.000Z')
  })

  it('names the zone in the language', () => {
    const at = new Date('2026-10-05T00:00:00Z')
    expect(zoneName('Asia/Jakarta', 'id', at)).toBe('WIB')
    expect(zoneName('Asia/Makassar', 'id', at)).toBe('WITA')
    expect(zoneName('Asia/Jayapura', 'id', at)).toBe('WIT')
    expect(zoneName('Asia/Jakarta', 'en', at)).toBe('GMT+7')
  })
})
