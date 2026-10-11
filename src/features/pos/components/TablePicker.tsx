import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { FormAlert } from '@/shared/components/FormMessage'
import type { FloorTable } from '@/shared/components/TableFloor'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

import { floorQuery } from '../api'
import { selectable } from '../tables'
import { FloorView } from './FloorView'

/**
 * Picks the order's table from the floor as it is now, loaded again each
 * time it opens: one the cashier can sell at, available or occupied (an
 * order more there is a sale of its own).
 */
export function TablePicker({
  outletId,
  open,
  picked,
  onPick,
  onOpenChange,
}: {
  outletId: string
  open: boolean
  picked: string | null
  onPick: (table: FloorTable) => void
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const floor = useQuery({ ...floorQuery(outletId), enabled: open })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('tables.pick.title')}</DialogTitle>
          <DialogDescription>{t('tables.pick.intro')}</DialogDescription>
        </DialogHeader>
        {floor.isPending ? (
          <p role="status" className="text-body-md text-on-surface-variant">
            {tCommon('list.loading')}
          </p>
        ) : floor.isError ? (
          <FormAlert className="grid justify-items-start gap-3">
            <p>{apiErrorMessage(tCommon, floor.error)}</p>
            <Button variant="outline" className="h-11" onClick={() => void floor.refetch()}>
              {t('tables.pick.retry')}
            </Button>
          </FormAlert>
        ) : (
          <FloorView
            floor={floor.data}
            picked={picked}
            canPick={selectable}
            onPick={(table) => {
              onPick(table)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
