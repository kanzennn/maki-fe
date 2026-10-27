import { useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/shared/badge'

import type { Menu } from '@/modules/menu/types'

/**
 * A menu's stock in words and number: the count, with DESIGN.md's low-stock
 * badge and count in the warning colour when it is low, and pushed back in
 * grey when it is out. An untracked menu has no count.
 */
export function StockLevel({
  menu,
  className,
}: {
  menu: Pick<Menu, 'stock_qty' | 'stock_status'>
  className?: string
}) {
  const { t, i18n } = useTranslation('menu')
  if (menu.stock_status === 'untracked') {
    return <span className={cn('text-on-surface-variant', className)}>{t('stock.status.untracked')}</span>
  }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <span
        className={cn(
          menu.stock_status === 'low' && 'text-on-warning-container',
          menu.stock_status === 'out' && 'text-on-surface-variant',
          menu.stock_status === 'ok' && 'text-on-surface',
        )}
      >
        {formatNumber(menu.stock_qty, i18n.language)}
      </span>
      {menu.stock_status === 'low' && <Badge variant="warning">{t('stock.status.low')}</Badge>}
      {menu.stock_status === 'out' && <Badge variant="secondary">{t('stock.status.out')}</Badge>}
    </span>
  )
}
