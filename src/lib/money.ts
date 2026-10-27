/**
 * Formats a Rupiah amount (an integer, never a float) for display. The
 * currency stays Rupiah in every language; only the separators follow the
 * language: `Rp 25.000` in Indonesian, `Rp 25,000` in English.
 */
export function formatRupiah(amount: number, locale: string): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Rupiah amounts must be integers, got ${amount}`)
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    // The defaults would render "IDR 25,000.00" in English.
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
