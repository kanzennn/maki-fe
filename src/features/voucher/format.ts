import { formatRupiah } from '@/shared/lib/money'
import { formatRate } from '@/shared/lib/percent'
import { formatDateTime } from '@/shared/lib/time'

import type { Voucher } from './api'
import { WIB } from './schemas'

/** A voucher's discount in short: `12,5%` or `Rp 5.000`. */
export function formatDiscount(voucher: Pick<Voucher, 'type' | 'value'>, locale: string): string {
  return voucher.type === 'percent' ? formatRate(voucher.value, locale) : formatRupiah(voucher.value, locale)
}

/** A voucher's time, in WIB whatever the browser's zone; the text says "WIB" beside it. */
export function formatWib(iso: string, locale: string): string {
  return formatDateTime(iso, locale, WIB)
}
