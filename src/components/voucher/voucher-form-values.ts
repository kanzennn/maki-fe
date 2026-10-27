import { showPercent } from '@/lib/percent'
import { toZonedInput } from '@/lib/time'
import { WIB, type Voucher, type VoucherFormValues } from '@/modules/voucher/types'

/**
 * The voucher form's starting values: a voucher's — its percentage written
 * the way the language writes it, its times as WIB shows them — or a new
 * voucher's defaults.
 */
export function voucherFormValues(language: string, voucher?: Voucher): VoucherFormValues {
  const value = voucher
    ? voucher.type === 'percent'
      ? showPercent(voucher.value / 100, language)
      : String(voucher.value)
    : ''
  return {
    code: voucher?.code ?? '',
    name: voucher?.name ?? '',
    type: voucher?.type ?? 'percent',
    value,
    max_discount: voucher?.max_discount != null ? String(voucher.max_discount) : '',
    min_spend: voucher?.min_spend != null ? String(voucher.min_spend) : '',
    quota: voucher ? String(voucher.quota) : '',
    start_at: voucher?.start_at ? toZonedInput(voucher.start_at, WIB) : '',
    expired_at: voucher ? toZonedInput(voucher.expired_at, WIB) : '',
    all_outlets: voucher?.all_outlets ?? true,
    outlet_ids: voucher?.outlets.map((o) => o.outlet_id) ?? [],
    is_active: voucher?.is_active ?? true,
  }
}
