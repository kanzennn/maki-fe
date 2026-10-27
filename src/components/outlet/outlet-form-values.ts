import { showPercent } from '@/lib/percent'
import type { Outlet, OutletFormValues } from '@/modules/outlet/types'

/**
 * The outlet form's starting values: an outlet's, with its percentages
 * written the way the language writes them, or a new outlet's defaults.
 */
export function outletFormValues(language: string, outlet?: Outlet): OutletFormValues {
  return {
    code: outlet?.code ?? '',
    name: outlet?.name ?? '',
    address: outlet?.address ?? '',
    phone: outlet?.phone ?? '',
    timezone: outlet?.timezone ?? 'Asia/Jakarta',
    locale: outlet?.locale ?? 'id',
    open_time: outlet?.open_time ?? '',
    close_time: outlet?.close_time ?? '',
    tax_pct: outlet ? showPercent(outlet.tax_pct, language) : '0',
    service_pct: outlet ? showPercent(outlet.service_pct, language) : '0',
  }
}
