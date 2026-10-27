import { SearchIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryIcon } from '@/components/menu/category-icon'
import { formatRupiah } from '@/lib/money'
import { formatNumber } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/shared/badge'

import type { PosCatalog, PosMenu } from '@/modules/pos/types'
import { shown } from '@/modules/pos/usecases/browse-menus.usecase'
import { maxQty } from '@/modules/pos/validations/cart.validation'

/**
 * The menus the cashier picks from, in the catalog's order (the spec's
 * Aturan tampilan menu), narrowed by a category tile and the search, which
 * keep that order. A tap adds one to the order; a menu out of stock can't be
 * picked.
 */
export function MenuBrowser({
  catalog,
  category,
  onCategory,
  search,
  onSearch,
  inCart,
  onAdd,
}: {
  catalog: PosCatalog
  category: string | null
  onCategory: (categoryId: string | null) => void
  search: string
  onSearch: (search: string) => void
  /** How many of each menu the order holds. */
  inCart: Map<string, number>
  onAdd: (menu: PosMenu) => void
}) {
  const { t } = useTranslation('pos')
  const searchId = useId()
  const icons = new Map(catalog.categories.map((c) => [c.category_id, c.icon]))
  const menus = shown(catalog.menus, category, search)

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {t('menu.search')}
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          placeholder={`${t('menu.search')} · ${t('menu.searchPlaceholder')}`}
          onChange={(e) => onSearch(e.target.value)}
          className="h-11 w-full rounded-field border border-outline bg-surface pr-10 pl-4 text-body-md text-on-surface outline-none placeholder:text-text-placeholder focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-icon-muted"
        />
      </div>

      <section aria-label={t('menu.categories')} className="min-w-0">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 expanded:mx-0 expanded:px-0">
          <li className="shrink-0">
            <CategoryTile
              active={category === null}
              icon={null}
              name={t('menu.all')}
              count={catalog.menus.length}
              onClick={() => onCategory(null)}
            />
          </li>
          {catalog.categories.map((c) => (
            <li key={c.category_id} className="shrink-0">
              <CategoryTile
                active={category === c.category_id}
                icon={c.icon}
                name={c.name}
                count={c.item_count}
                onClick={() => onCategory(c.category_id)}
              />
            </li>
          ))}
        </ul>
      </section>

      {catalog.menus.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('menu.none')}</p>
      ) : menus.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('menu.noMatch')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 expanded:grid-cols-3 xl:grid-cols-4 expanded:gap-4">
          {menus.map((menu) => (
            <li key={menu.menu_id} className="grid">
              <MenuCard
                menu={menu}
                icon={icons.get(menu.category_id) ?? null}
                inCart={inCart.get(menu.menu_id) ?? 0}
                onAdd={() => onAdd(menu)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * DESIGN.md's category tile: its emoji, name and item count; the chosen one
 * on primary-container-muted with a primary border. Below 840px a compact
 * tile without the count.
 */
function CategoryTile({
  active,
  icon,
  name,
  count,
  onClick,
}: {
  active: boolean
  icon: string | null
  name: string
  count: number
  onClick: () => void
}) {
  const { t } = useTranslation('pos')
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-12 items-center gap-2 rounded-tile border px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 expanded:min-w-36',
        active
          ? 'border-primary bg-primary-container-muted text-primary-strong'
          : 'border-outline bg-surface text-on-surface hover:bg-surface-container-low',
      )}
    >
      <CategoryIcon icon={icon} />
      <span className="grid">
        <span className="text-label-md whitespace-nowrap">{name}</span>
        <span className="hidden text-label-sm text-on-surface-variant expanded:inline">
          {t('menu.items', { count })}
        </span>
      </span>
    </button>
  )
}

/**
 * DESIGN.md's product card: the photo (the category's emoji until menus have
 * photos), the name, the stock, the price. Low stock gets the warning badge
 * and its count in the warning colour; out of stock is pushed back in grey,
 * grayscale, and can't be picked.
 */
function MenuCard({
  menu,
  icon,
  inCart,
  onAdd,
}: {
  menu: PosMenu
  icon: string | null
  inCart: number
  onAdd: () => void
}) {
  const { t, i18n } = useTranslation('pos')
  const out = menu.stock_status === 'out'
  const full = !out && inCart >= maxQty(menu)
  const count = (n: number) => formatNumber(n, i18n.language)
  const stock =
    menu.stock_status === 'untracked'
      ? t('menu.always')
      : out
        ? t('menu.out')
        : t('menu.available', { count: count(menu.stock_qty ?? 0) })

  return (
    <button
      type="button"
      disabled={out || full}
      onClick={onAdd}
      className={cn(
        'grid w-full content-start overflow-hidden rounded-card border border-outline text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        out ? 'cursor-not-allowed bg-surface-variant' : 'bg-surface hover:border-primary',
        full && 'cursor-not-allowed',
      )}
    >
      {/* The badges are said after the name (below), so the card is called by its name. */}
      <span aria-hidden="true" className="relative grid aspect-[4/3] place-items-center bg-surface-container">
        <span className={cn('text-[2.5rem]', out && 'grayscale')}>
          {icon ?? <CategoryIcon icon={null} className="size-10" />}
        </span>
        {menu.stock_status === 'low' && (
          <Badge variant="warning" className="absolute top-2 left-2">
            {t('menu.low')}
          </Badge>
        )}
        {inCart > 0 && (
          <Badge className="absolute right-2 bottom-2 border-primary">{t('menu.inCart', { count: count(inCart) })}</Badge>
        )}
      </span>
      <span className="grid gap-1 p-3">
        <span className="line-clamp-2 text-title-md text-on-surface">{menu.name}</span>
        <span
          className={cn(
            'text-label-sm',
            menu.stock_status === 'low' ? 'text-on-warning-container' : 'text-on-surface-variant',
          )}
        >
          {stock}
          {menu.stock_status === 'low' && <span className="sr-only">, {t('menu.low')}</span>}
        </span>
        <span className="text-price-lg text-on-surface">{formatRupiah(menu.price, i18n.language)}</span>
        {inCart > 0 && <span className="sr-only">{t('menu.inCart', { count: count(inCart) })}</span>}
      </span>
    </button>
  )
}
