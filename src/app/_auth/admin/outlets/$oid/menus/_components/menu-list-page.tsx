import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useParams } from '@tanstack/react-router'
import { PlusIcon, TagsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CategoryIcon } from '@/components/menu/category-icon'
import { Pagination } from '@/components/shared/pagination'
import { PageHeader } from '@/components/shared/page-header'
import { SearchField } from '@/components/shared/search-field'
import { SelectField } from '@/components/shared/select-field'
import { StatusBadge } from '@/components/shared/status-badge'
import { useCan } from '@/hooks/use-can'
import { formatRupiah } from '@/lib/money'
import { Button } from '@/components/shared/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import { allCategoriesQuery, menuListQuery } from '@/hooks/menu/menu.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import type { Menu, MenuListState, StockStatus } from '@/modules/menu/types'
import { StockLevel } from '@/components/menu/stock-level'

const route = getRouteApi('/_auth/admin/outlets/$oid/menus/')

const stockStatuses = ['ok', 'low', 'out', 'untracked'] as const satisfies readonly StockStatus[]

/**
 * An outlet's menus in the cashier's order: by category, then name. Search
 * by name or SKU, filter by category, status and stock.
 */
export function MenuListPage() {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation()
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/menus/' })
  const { state: search, filter, setPage } = useUrlListState(route)
  const can = useCan()
  const { data } = useSuspenseQuery(menuListQuery(oid, search))
  const { data: categories } = useSuspenseQuery(allCategoriesQuery(oid))
  const filtered = Boolean(search.q || search.category_id || search.status || search.stock)

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('list.title')}
        actions={
          <>
            <Button asChild variant="outline" className="h-11">
              <Link to="/admin/outlets/$oid/menus/categories" params={{ oid }}>
                <TagsIcon aria-hidden="true" />
                {t('list.categories')}
              </Link>
            </Button>
            {can('menu.manage') && (
              <Button asChild className="h-11">
                <Link to="/admin/outlets/$oid/menus/new" params={{ oid }}>
                  <PlusIcon aria-hidden="true" />
                  {t('list.create')}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_10rem]">
        <SearchField
          label={t('list.search')}
          placeholder={t('list.searchPlaceholder')}
          value={search.q ?? ''}
          onSearch={(q) => filter({ q: q || undefined })}
        />
        <SelectField
          label={t('fields.category')}
          value={search.category_id ?? ''}
          onChange={(e) => filter({ category_id: e.target.value || undefined })}
        >
          <option value="">{t('list.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.icon ? `${category.icon} ${category.name}` : category.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={tCommon('status.label')}
          value={search.status ?? ''}
          onChange={(e) => filter({ status: (e.target.value || undefined) as MenuListState['status'] })}
        >
          <option value="">{tCommon('status.all')}</option>
          <option value="active">{tCommon('status.active')}</option>
          <option value="inactive">{tCommon('status.inactive')}</option>
        </SelectField>
        <SelectField
          label={t('list.stock')}
          value={search.stock ?? ''}
          onChange={(e) => filter({ stock: (e.target.value || undefined) as StockStatus | undefined })}
        >
          <option value="">{t('list.allStock')}</option>
          {stockStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`stock.status.${status}`)}
            </option>
          ))}
        </SelectField>
      </div>

      {data.items.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">
            {data.total > 0
              ? tCommon('list.pastEnd')
              : filtered
                ? t('list.noMatch')
                : categories.length === 0
                  ? t('list.noCategories')
                  : t('list.empty')}
          </p>
          {data.total > 0 && (
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setPage(undefined)}
            >
              {tCommon('list.firstPage')}
            </Button>
          )}
        </div>
      ) : (
        // min-w-0: a table wider than the screen scrolls in its box instead
        // of widening the page.
        <div className="min-w-0 rounded-card border border-outline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.menu')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('fields.price')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('stock.title')}</TableHead>
                <TableHead>{tCommon('status.label')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((menu) => (
                <MenuRow key={menu.menu_id} outletId={oid} menu={menu} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination list={data} onPage={setPage} />
    </div>
  )
}

/**
 * A menu's row: its category's icon and name, with the category and SKU
 * under it. An inactive category hides its menus at the cashier, active or
 * not, so the row says so. On a phone the price and stock go under the name
 * too, instead of columns that would squeeze it.
 */
function MenuRow({ outletId, menu }: { outletId: string; menu: Menu }) {
  const { t, i18n } = useTranslation('menu')
  const category = menu.category.is_active
    ? menu.category.name
    : t('list.categoryInactive', { name: menu.category.name })

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-2">
          <CategoryIcon icon={menu.category.icon} className="mt-px" />
          <div className="grid min-w-0 gap-0.5">
            <Link
              to="/admin/outlets/$oid/menus/$mid"
              params={{ oid: outletId, mid: menu.menu_id }}
              className="text-title-md text-on-surface underline-offset-4 hover:underline"
            >
              {menu.name}
            </Link>
            <p className="text-label-md text-on-surface-variant">
              {[category, menu.sku && t('list.sku', { sku: menu.sku })].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
              <span className="text-on-surface">{formatRupiah(menu.price, i18n.language)}</span>
              <StockLevel menu={menu} />
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-on-surface sm:table-cell">{formatRupiah(menu.price, i18n.language)}</TableCell>
      <TableCell className="hidden sm:table-cell">
        <StockLevel menu={menu} />
      </TableCell>
      <TableCell>
        <StatusBadge status={menu.is_active ? 'active' : 'inactive'} />
      </TableCell>
    </TableRow>
  )
}
