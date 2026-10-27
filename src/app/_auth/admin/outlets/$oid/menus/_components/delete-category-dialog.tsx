import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormAlert } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shared/alert-dialog'
import { Button } from '@/components/shared/button'

import { useDeleteCategory } from '@/hooks/menu/menu.queries'
import type { Category } from '@/modules/menu/types'

/**
 * Deletes a category that holds no menus. While it holds some, it says how
 * many instead: they move or go first. The server's 409 says the same if a
 * menu joined it meanwhile.
 */
export function DeleteCategoryDialog({
  outletId,
  category,
  onDone,
}: {
  outletId: string
  category: Category
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation()
  const remove = useDeleteCategory(outletId, category.category_id)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menus, setMenus] = useState(category.menu_count)

  async function confirm() {
    setError(null)
    try {
      await remove.mutateAsync()
      setOpen(false)
      onDone(t('categories.delete.done', { name: category.name }))
    } catch (caught) {
      const held = caught instanceof ApiError && caught.code === 'category_in_use' ? caught.details?.menus : undefined
      if (typeof held === 'number') setMenus(held)
      else setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        setMenus(category.menu_count)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 text-error">
          {t('categories.delete.action')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('categories.delete.title', { name: category.name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {menus > 0 ? t('categories.delete.inUse', { count: menus }) : t('categories.delete.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FormAlert>{error}</FormAlert>}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{tCommon('actions.cancel')}</AlertDialogCancel>
          {menus === 0 && (
            <Button variant="destructive" className="h-11" disabled={remove.isPending} onClick={() => void confirm()}>
              {t('categories.delete.action')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
