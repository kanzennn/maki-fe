/**
 * A rate in basis points as the language writes a percentage: 1000 is
 * `10%`, 550 is `5,5%` in Indonesian and `5.5%` in English.
 */
export function formatRate(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(bps / 10000)
}

/** A percentage as typed into a form, with a comma or a point; empty is 0. */
export function parsePercent(value: string): number {
  const v = value.trim().replace(',', '.')
  return v === '' ? 0 : Number(v)
}

/** A percentage for a form's field, as the user's language writes it: 5,5 in Indonesian. */
export function showPercent(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 2, useGrouping: false }).format(value)
}
