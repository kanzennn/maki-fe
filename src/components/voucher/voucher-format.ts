import { formatRupiah } from '@/lib/money'
import { formatRate } from '@/lib/percent'
import { formatDateTime } from '@/lib/time'

import { WIB, type Voucher } from '@/modules/voucher/types'

/** A voucher's discount in short: `12,5%` or `Rp 5.000`. */
export function formatDiscount(voucher: Pick<Voucher, 'type' | 'value'>, locale: string): string {
  return voucher.type === 'percent' ? formatRate(voucher.value, locale) : formatRupiah(voucher.value, locale)
}

/** A voucher's time, in WIB whatever the browser's zone; the text says "WIB" beside it. */
export function formatWib(iso: string, locale: string): string {
  return formatDateTime(iso, locale, WIB)
}
