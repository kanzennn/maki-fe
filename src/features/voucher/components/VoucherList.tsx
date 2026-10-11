import { useTranslation } from 'react-i18next'

import { Pagination } from '@/shared/components/Pagination'
import { SearchField } from '@/shared/components/SearchField'
import { SelectField } from '@/shared/components/SelectField'
import { Button } from '@/shared/ui/button'

import { voucherStatuses, type Voucher, type VoucherSearch, type VoucherStatus } from '../api'
import { VoucherTable } from './VoucherTable'

type Page = { data: Voucher[]; meta: { page: number; page_size: number; total: number } }

/**
 * A voucher list with its search and status filter, for the Owner's list
 * and an outlet's. A new filter starts again from the first page.
 */
export function VoucherList({
  page,
  search,
  linked,
  onSearch,
}: {
  page: Page
  search: VoucherSearch
  /** The Owner's rows open the voucher. */
  linked: boolean
  onSearch: (search: VoucherSearch) => void
}) {
  const { t } = useTranslation('voucher')
  const { t: tCommon } = useTranslation()
  const filtered = Boolean(search.q || search.status)
  const filter = (next: Omit<VoucherSearch, 'page'>) => onSearch({ ...search, ...next, page: undefined })

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchField
          label={t('list.search')}
          placeholder={t('list.searchPlaceholder')}
          value={search.q ?? ''}
          onSearch={(q) => filter({ q: q || undefined })}
        />
        <SelectField
          label={tCommon('status.label')}
          value={search.status ?? ''}
          onChange={(e) => filter({ status: (e.target.value || undefined) as VoucherStatus | undefined })}
        >
          <option value="">{tCommon('status.all')}</option>
          {voucherStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </SelectField>
      </div>

      {page.data.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">
            {page.meta.total > 0 ? tCommon('list.pastEnd') : filtered ? t('list.noMatch') : t('list.empty')}
          </p>
          {page.meta.total > 0 && (
            <Button variant="outline" className="h-11" onClick={() => onSearch({ ...search, page: undefined })}>
              {tCommon('list.firstPage')}
            </Button>
          )}
        </div>
      ) : (
        <VoucherTable vouchers={page.data} linked={linked} />
      )}

      <Pagination meta={page.meta} onPage={(p) => onSearch({ ...search, page: p })} />
    </>
  )
}
