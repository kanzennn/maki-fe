import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryIcon } from '@/shared/components/CategoryIcon'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FormAlert, FormNotice } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useCan } from '@/shared/hooks/useCan'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { Button } from '@/shared/ui/button'

import { allCategoriesQuery, useReorderCategories, useSetCategoryActive, type Category } from '../api'
import { CategoryDialog } from './CategoryDialog'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'

type Move = { categoryId: string; direction: 'up' | 'down' }

/**
 * An outlet's categories in the cashier's order, which whoever manages the
 * menu changes a step at a time. A move takes effect at once and is
 * announced, and focus stays on the moved category's button.
 */
export function CategoryListPage() {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation()
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/menus/categories' })
  const can = useCan()
  const { data: categories } = useSuspenseQuery(allCategoriesQuery(oid))
  const reorder = useReorderCategories(oid)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The button to focus once the list has redrawn in its new order.
  const moved = useRef<Move | null>(null)

  useLayoutEffect(() => {
    const move = moved.current
    if (!move) return
    moved.current = null
    const other = move.direction === 'up' ? 'down' : 'up'
    const button = document.getElementById(moveId(move.categoryId, move.direction)) as HTMLButtonElement | null
    const fallback = document.getElementById(moveId(move.categoryId, other))
    ;(button && !button.disabled ? button : fallback)?.focus()
  }, [categories])

  async function move(index: number, direction: 'up' | 'down') {
    // One move at a time. The buttons stay enabled meanwhile, so the one in
    // use keeps its focus.
    if (reorder.isPending) return
    setError(null)
    setNotice(null)
    const target = direction === 'up' ? index - 1 : index + 1
    const order = categories.map((category) => category.category_id)
    ;[order[index], order[target]] = [order[target], order[index]]
    moved.current = { categoryId: categories[index].category_id, direction }
    try {
      await reorder.mutateAsync(order)
      setNotice(t('categories.moved', { name: categories[index].name, position: target + 1 }))
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/menus" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={t('categories.title')}
        description={t('categories.intro')}
        actions={
          can('menu.manage') && (
            <CategoryDialog
              outletId={oid}
              onDone={setNotice}
              trigger={
                <Button className="h-11">
                  <PlusIcon aria-hidden="true" />
                  {t('categories.create')}
                </Button>
              }
            />
          )
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}
      {error && <FormAlert>{error}</FormAlert>}

      {categories.length === 0 ? (
        <p className="rounded-card border border-outline p-6 text-on-surface-variant">{t('categories.empty')}</p>
      ) : (
        <ol className="grid rounded-card border border-outline">
          {categories.map((category, index) => (
            <li
              key={category.category_id}
              className="flex flex-wrap items-center gap-3 border-b border-outline p-3 last:border-b-0"
            >
              {can('menu.manage') && (
                <div className="flex gap-1">
                  <Button
                    id={moveId(category.category_id, 'up')}
                    variant="outline"
                    className="size-11"
                    aria-label={t('categories.moveUp', { name: category.name })}
                    disabled={index === 0}
                    onClick={() => void move(index, 'up')}
                  >
                    <ArrowUpIcon className="size-5" />
                  </Button>
                  <Button
                    id={moveId(category.category_id, 'down')}
                    variant="outline"
                    className="size-11"
                    aria-label={t('categories.moveDown', { name: category.name })}
                    disabled={index === categories.length - 1}
                    onClick={() => void move(index, 'down')}
                  >
                    <ArrowDownIcon className="size-5" />
                  </Button>
                </div>
              )}
              <CategoryIcon icon={category.icon} className="size-8" />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="text-title-md break-words text-on-surface">{category.name}</p>
                <p className="text-label-md text-on-surface-variant">
                  {t('categories.menuCount', { count: category.menu_count })}
                </p>
              </div>
              <StatusBadge status={category.is_active ? 'active' : 'inactive'} />
              {can('menu.manage') && (
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <CategoryDialog
                    outletId={oid}
                    category={category}
                    onDone={setNotice}
                    trigger={
                      <Button variant="outline" className="h-11">
                        {t('categories.form.edit')}
                      </Button>
                    }
                  />
                  <StatusButton outletId={oid} category={category} onDone={setNotice} />
                  <DeleteCategoryDialog outletId={oid} category={category} onDone={setNotice} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function moveId(categoryId: string, direction: 'up' | 'down') {
  return `category-${categoryId}-${direction}`
}

function StatusButton({
  outletId,
  category,
  onDone,
}: {
  outletId: string
  category: Category
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('menu')
  const setActive = useSetCategoryActive(outletId, category.category_id)
  const copy = category.is_active ? 'deactivate' : 'activate'
  return (
    <ConfirmDialog
      trigger={
        // As wide either way, so the rows' buttons line up.
        <Button variant="outline" className="h-11 min-w-32">
          {t(`categories.${copy}.action`)}
        </Button>
      }
      title={t(`categories.${copy}.title`, { name: category.name })}
      description={t(`categories.${copy}.body`, { name: category.name })}
      confirmLabel={t(`categories.${copy}.action`)}
      destructive={category.is_active}
      onConfirm={async () => {
        await setActive.mutateAsync(!category.is_active)
        onDone(t(`categories.${copy}.done`, { name: category.name }))
      }}
    />
  )
}
