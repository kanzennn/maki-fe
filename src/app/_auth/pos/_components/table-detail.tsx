import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Detail } from '@/components/shared/detail'
import { TableStatusBadge } from '@/components/table/table-floor'
import type { FloorTable } from '@/modules/table/types'
import { useSession } from '@/hooks/use-session'
import { formatTime } from '@/lib/time'
import { Button } from '@/components/shared/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/dialog'

import { useCart } from '@/hooks/pos/use-cart'
import { useReleaseTable } from '@/hooks/table/table.queries'
import { selectable } from '@/modules/pos/usecases/select-table.usecase'

/**
 * A table at the cashier: its status and, while customers are seated there,
 * since when and how many sales; ordering at it while it can be picked; and
 * releasing it once its customers have left, after asking.
 */
export function TableDetail({
  outletId,
  table,
  area,
  onClose,
  onDone,
}: {
  outletId: string
  /** The table shown; none when closed. */
  table: FloorTable | null
  area: string
  onClose: () => void
  onDone: (notice: string) => void
}) {
  const { t, i18n } = useTranslation('pos')
  const navigate = useNavigate()
  const release = useReleaseTable(outletId)
  const pending = useCart((s) => s.pending !== null)
  const setType = useCart((s) => s.setType)
  const setTable = useCart((s) => s.setTable)
  const timeZone = useSession((s) => s.user?.outlet?.timezone ?? 'Asia/Jakarta')

  return (
    <Dialog
      open={table !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {table && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tables.detailTitle', { name: table.name })}</DialogTitle>
            <DialogDescription>{area}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <TableStatusBadge status={table.status} />
            <dl className="grid grid-cols-2 gap-4">
              <Detail term={t('tables.seats')}>
                {table.capacity === null ? t('tables.noSeats') : t('tables.seatCount', { count: table.capacity })}
              </Detail>
              {table.seated && (
                <>
                  <Detail term={t('tables.since')}>{formatTime(table.seated.since, i18n.language, timeZone)}</Detail>
                  <Detail term={t('tables.orders')}>{table.seated.orders}</Detail>
                </>
              )}
            </dl>
            {table.status === 'inactive' && <p className="text-body-md text-on-surface-variant">{t('tables.inactive')}</p>}
            {table.status === 'scheduled' && <p className="text-body-md text-on-surface-variant">{t('tables.scheduled')}</p>}
            {pending && selectable(table) && (
              <p className="text-body-md text-on-surface-variant">{t('tables.pendingHint')}</p>
            )}
          </div>
          <DialogFooter>
            {table.status === 'occupied' && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="h-11">
                    {t('tables.release.action')}
                  </Button>
                }
                title={t('tables.release.title', { name: table.name })}
                description={t('tables.release.body')}
                confirmLabel={t('tables.release.action')}
                onConfirm={async () => {
                  await release.mutateAsync(table.table_id)
                  onClose()
                  onDone(t('tables.release.done', { name: table.name }))
                }}
              />
            )}
            {selectable(table) && (
              <Button
                className="h-11"
                disabled={pending}
                onClick={() => {
                  setType('dine_in')
                  setTable({ tableId: table.table_id, name: table.name })
                  onClose()
                  void navigate({ to: '/pos' })
                }}
              >
                {t('tables.order')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
