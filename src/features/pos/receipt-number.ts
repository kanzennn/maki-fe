/**
 * The outlet's day that an instant falls in, as YYYY-MM-DD: GET /pos/device
 * says which day its count is of in the same form. The day is the outlet's,
 * whatever zone the browser is in.
 */
export function outletDay(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * A receipt number as the device makes it: OUTLET-DEVICE-YYYYMMDD-0001, the
 * prefix being the outlet's code and the device's (BDG01-K01), then the day,
 * then the device's count that day in at least four digits.
 */
export function receiptNumber(prefix: string, day: string, count: number): string {
  return `${prefix}-${day.replaceAll('-', '')}-${String(count).padStart(4, '0')}`
}

/** Where the device's count is: of which day, and the number it takes next. */
export type Count = { day: string; next: number }

/**
 * The count a receipt number made on today takes: the next one of the day
 * the count is of, or 1 on a new day.
 */
export function countFor(count: Count, today: string): number {
  return count.day === today ? count.next : 1
}
