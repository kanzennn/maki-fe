/**
 * Times travel as UTC RFC 3339 strings and are always shown in the outlet's
 * time zone, never the browser's.
 */
export function formatDate(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(new Date(iso))
}

export function formatDateTime(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
    new Date(iso),
  )
}

/** From one time to another, the day written once when they share it: "5 Okt 2026 14.00–18.00". */
export function formatDateTimeRange(startIso: string, endIso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).formatRange(
    new Date(startIso),
    new Date(endIso),
  )
}

/** The time of day alone, for a list of today's events. */
export function formatTime(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(iso))
}

/**
 * The zone's offset from UTC at the instant, in minutes: 420 for Jakarta.
 * Worked out with Intl, so it follows the zone's own rules.
 */
function offsetMinutes(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
  return Math.round((wall - Math.floor(instant / 1000) * 1000) / 60_000)
}

/** An instant as a datetime-local field shows it in the zone: 2026-10-05T14:30. */
export function toZonedInput(iso: string, timeZone: string): string {
  const instant = Date.parse(iso)
  return new Date(instant + offsetMinutes(instant, timeZone) * 60_000).toISOString().slice(0, 16)
}

/**
 * Whether value is a datetime-local field's: a day and a time, to the
 * minute, that the calendar has (no 13th month, no 25th hour), so
 * fromZonedInput can read it.
 */
export function isZonedInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}:00Z`))
}

/**
 * A datetime-local field's value, read in the zone, as the instant the API
 * takes. A time a zone skips when its clocks go forward reads as the time
 * that much later.
 */
export function fromZonedInput(value: string, timeZone: string): string {
  // The wall time as if it were UTC, then moved by the zone's offset there;
  // once more, in case the offset differs at the instant found.
  const wall = Date.parse(`${value}:00Z`)
  const guess = wall - offsetMinutes(wall, timeZone) * 60_000
  return new Date(wall - offsetMinutes(guess, timeZone) * 60_000).toISOString()
}

/** The zone's short name in the language, at the instant: WIB, WITA, WIT, or GMT+7. */
export function zoneName(timeZone: string, locale: string, at: Date = new Date()): string {
  return (
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  )
}
