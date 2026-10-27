/**
 * Whole numbers — stock counts, amounts typed into a form — with the
 * language's thousands separators: `1.250` in Indonesian, `1,250` in
 * English. Rupiah amounts for display go through formatRupiah instead.
 */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

/** A change to a count, signed: `+5`, `-3`, and `0` for none. */
export function formatChange(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0, signDisplay: 'exceptZero' }).format(value)
}

/**
 * A number field's digits as the field shows them while it is typed in,
 * grouped the way the language groups them; '' stays ''.
 */
export function groupDigits(digits: string, locale: string): string {
  return digits === '' ? '' : formatNumber(Number(digits), locale)
}
