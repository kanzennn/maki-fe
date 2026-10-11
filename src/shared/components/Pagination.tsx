import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { components } from '@/shared/api/schema'
import { Button } from '@/shared/ui/button'

type ListMeta = components['schemas']['ListMeta']

/** Where a list page sits in the whole list, with previous and next. */
export function Pagination({ meta, onPage }: { meta: ListMeta; onPage: (page: number) => void }) {
  const { t } = useTranslation()
  if (meta.total === 0) return null

  const last = Math.max(1, Math.ceil(meta.total / meta.page_size))
  const from = Math.min(meta.total, (meta.page - 1) * meta.page_size + 1)
  const to = Math.min(meta.total, meta.page * meta.page_size)

  return (
    <nav aria-label={t('list.pages')} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-md text-on-surface-variant">{t('list.range', { from, to, total: meta.total })}</p>
      {last > 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="size-11"
            aria-label={t('list.previous')}
            disabled={meta.page <= 1}
            onClick={() => onPage(Math.min(meta.page - 1, last))}
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
          <Button
            variant="outline"
            className="size-11"
            aria-label={t('list.next')}
            disabled={meta.page >= last}
            onClick={() => onPage(meta.page + 1)}
          >
            <ChevronRightIcon className="size-5" />
          </Button>
        </div>
      )}
    </nav>
  )
}
