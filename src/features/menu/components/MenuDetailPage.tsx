import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryIcon } from '@/shared/components/CategoryIcon'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Detail } from '@/shared/components/Detail'
import { FormNotice } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { SectionHeading } from '@/shared/components/PageHeading'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useCan } from '@/shared/hooks/useCan'
import { formatRupiah } from '@/shared/lib/money'
import { formatNumber } from '@/shared/lib/number'
import { Button } from '@/shared/ui/button'

import {
  allCategoriesQuery,
  menuQuery,
  useDeleteMenu,
  useForgetMenu,
  useSetMenuActive,
  useUpdateMenu,
  type Menu,
} from '../api'
import { AdjustStockDialog } from './AdjustStockDialog'
import { MenuForm } from './MenuForm'
import { StockAlertDialog } from './StockAlertDialog'
import { StockHistory } from './StockHistory'
import { StockLevel } from './StockLevel'

/**
 * One menu: its stock and what can be done with it, its form for whoever
 * manages the menu (its details, read only, for anyone else), its stock
 * history, and showing, hiding or deleting it.
 */
export function MenuDetailPage() {
  const { t } = useTranslation('menu')
  const { oid, mid } = useParams({ from: '/_auth/admin/outlets/$oid/menus/$mid' })
  const search = useSearch({ from: '/_auth/admin/outlets/$oid/menus/$mid' })
  const navigate = useNavigate({ from: '/admin/outlets/$oid/menus/$mid' })
  const can = useCan()
  const { data: menu } = useSuspenseQuery(menuQuery(oid, mid))
  const { data: categories } = useSuspenseQuery(allCategoriesQuery(oid))
  const update = useUpdateMenu(oid, mid)
  const [notice, setNotice] = useState<string | null>(null)
  // A saved form starts again from what the server kept. Stock that changes
  // meanwhile, or the status, leaves what is being typed alone.
  const [saves, setSaves] = useState(0)
  const category = menu.category.is_active
    ? menu.category.name
    : t('list.categoryInactive', { name: menu.category.name })

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/menus" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={menu.name}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <CategoryIcon icon={menu.category.icon} />
            <span>{category}</span>
            {menu.sku && <span>· {t('list.sku', { sku: menu.sku })}</span>}
            <StatusBadge status={menu.is_active ? 'active' : 'inactive'} />
          </div>
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}

      <StockPanel outletId={oid} menu={menu} onDone={setNotice} />

      <section aria-labelledby="menu-details" className="grid gap-3">
        <SectionHeading id="menu-details">{t('detail.details')}</SectionHeading>
        {can('menu.manage') ? (
          <MenuForm
            key={saves}
            menu={menu}
            categories={categories}
            submitLabel={t('edit.submit')}
            onSubmit={async (input) => {
              setNotice(null)
              await update.mutateAsync(input)
              setSaves((n) => n + 1)
              setNotice(t('edit.done'))
            }}
          />
        ) : (
          <MenuDetails menu={menu} />
        )}
      </section>

      <StockHistory
        outletId={oid}
        menuId={mid}
        page={search.page}
        onPage={(page) => void navigate({ search: { page }, resetScroll: false })}
        hideEmpty={!menu.track_stock}
      />

      {can('menu.manage') && (
        <section aria-labelledby="menu-actions" className="grid gap-3">
          <SectionHeading id="menu-actions">{t('detail.actions')}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            <StatusButton outletId={oid} menu={menu} onDone={setNotice} />
            <DeleteButton outletId={oid} menu={menu} />
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * The count and its condition, with the alert, and the stock actions the
 * user holds. Whoever manages the menu sets the alert in its form; whoever
 * only adjusts stock, here.
 */
function StockPanel({ outletId, menu, onDone }: { outletId: string; menu: Menu; onDone: (notice: string) => void }) {
  const { t, i18n } = useTranslation('menu')
  const can = useCan()

  return (
    <section aria-labelledby="menu-stock" className="grid gap-3">
      <SectionHeading id="menu-stock">{t('stock.title')}</SectionHeading>
      {menu.track_stock ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-outline p-4">
          <div className="grid gap-1">
            <StockLevel menu={menu} className="text-price-lg" />
            <p className="text-body-md text-on-surface-variant">
              {menu.stock_alert
                ? t('stock.alertAt', { stock: formatNumber(menu.stock_alert, i18n.language) })
                : t('stock.alertOff')}
            </p>
          </div>
          {can('stock.adjust') && (
            <div className="flex flex-wrap gap-2">
              {!can('menu.manage') && <StockAlertDialog outletId={outletId} menu={menu} onDone={onDone} />}
              <AdjustStockDialog outletId={outletId} menu={menu} onDone={onDone} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-on-surface-variant">{t('stock.untracked')}</p>
      )}
    </section>
  )
}

/** The menu's details, for whoever may see the menu but not change it. */
function MenuDetails({ menu }: { menu: Menu }) {
  const { t, i18n } = useTranslation('menu')
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <Detail term={t('fields.price')}>{formatRupiah(menu.price, i18n.language)}</Detail>
      <Detail term={t('fields.category')}>{menu.category.name}</Detail>
      <Detail term={t('fields.sku')}>{menu.sku ?? t('detail.none')}</Detail>
      <Detail term={t('fields.stockMode')}>{menu.track_stock ? t('form.tracked') : t('form.untracked')}</Detail>
      <Detail term={t('fields.description')} className="sm:col-span-2">
        {menu.description ?? t('detail.none')}
      </Detail>
    </dl>
  )
}

type ActionProps = { outletId: string; menu: Menu; onDone: (notice: string) => void }

function StatusButton({ outletId, menu, onDone }: ActionProps) {
  const { t } = useTranslation('menu')
  const setActive = useSetMenuActive(outletId, menu.menu_id)
  const copy = menu.is_active ? 'deactivate' : 'activate'
  return (
    <ConfirmDialog
      trigger={
        <Button variant={menu.is_active ? 'destructive' : 'default'} className="h-11">
          {t(`${copy}.action`)}
        </Button>
      }
      title={t(`${copy}.title`, { name: menu.name })}
      description={t(`${copy}.body`, { name: menu.name })}
      confirmLabel={t(`${copy}.action`)}
      destructive={menu.is_active}
      onConfirm={async () => {
        await setActive.mutateAsync(!menu.is_active)
        onDone(t(`${copy}.done`, { name: menu.name }))
      }}
    />
  )
}

function DeleteButton({ outletId, menu }: Omit<ActionProps, 'onDone'>) {
  const { t } = useTranslation('menu')
  const navigate = useNavigate()
  const remove = useDeleteMenu(outletId, menu.menu_id)
  const forget = useForgetMenu(outletId)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="h-11 text-error">
          {t('delete.action')}
        </Button>
      }
      title={t('delete.title', { name: menu.name })}
      description={t('delete.body')}
      confirmLabel={t('delete.action')}
      destructive
      onConfirm={async () => {
        await remove.mutateAsync()
        await navigate({ to: '/admin/outlets/$oid/menus', params: { oid: outletId } })
        forget(menu.menu_id)
      }}
    />
  )
}
