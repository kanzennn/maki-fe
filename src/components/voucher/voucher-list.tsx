import { useTranslation } from 'react-i18next'

import { Pagination } from '@/components/shared/pagination'
import { SearchField } from '@/components/shared/search-field'
import { SelectField } from '@/components/shared/select-field'
import { Button } from '@/components/shared/button'

import type { UrlListState } from '@/hooks/use-url-list-state'
import type { Page } from '@/lib/http'
import { voucherStatuses, type Voucher, type VoucherListState, type VoucherStatus } from '@/modules/voucher/types'

import { VoucherTable } from './voucher-table'

/**
 * A voucher list with its search and status filter, for the Owner's list
 * and an outlet's. A new filter starts again from the first page.
 */
export function VoucherList({
  page,
  list,
  linked,
}: {
  page: Page<Voucher>
  /** The list's state in the address bar (useUrlListState). */
  list: UrlListState<VoucherListState>
  /** The Owner's rows open the voucher. */
  linked: boolean
}) {
  const { t } = useTranslation('voucher')
  const { t: tCommon } = useTranslation()
  const { state: search, filter, setPage } = list
  const filtered = Boolean(search.q || search.status)

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

      {page.items.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">
            {page.total > 0 ? tCommon('list.pastEnd') : filtered ? t('list.noMatch') : t('list.empty')}
          </p>
          {page.total > 0 && (
            <Button variant="outline" className="h-11" onClick={() => setPage(undefined)}>
              {tCommon('list.firstPage')}
            </Button>
          )}
        </div>
      ) : (
        <VoucherTable vouchers={page.items} linked={linked} />
      )}

      <Pagination list={page} onPage={setPage} />
    </>
  )
}
