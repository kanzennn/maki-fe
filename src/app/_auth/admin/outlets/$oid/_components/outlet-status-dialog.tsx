import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/shared/button'

import { useSetOutletStatus } from '@/hooks/outlet/outlet.queries'
import type { Outlet } from '@/modules/outlet/types'

/**
 * Deactivates an active outlet — its users are signed out and can't sign in
 * — or activates an inactive one, after saying so.
 */
export function OutletStatusDialog({ outlet, onDone }: { outlet: Outlet; onDone: (notice: string) => void }) {
  const { t } = useTranslation('outlet')
  const setStatus = useSetOutletStatus(outlet.outlet_id)
  const deactivating = outlet.status === 'active'
  const copy = deactivating ? 'deactivate' : 'activate'

  return (
    <ConfirmDialog
      trigger={
        <Button variant={deactivating ? 'destructive' : 'default'} className="h-11">
          {t(`${copy}.action`)}
        </Button>
      }
      title={t(`${copy}.title`, { name: outlet.name })}
      description={t(`${copy}.body`)}
      confirmLabel={t(`${copy}.action`)}
      destructive={deactivating}
      onConfirm={async () => {
        await setStatus.mutateAsync(deactivating ? 'inactive' : 'active')
        onDone(t(`${copy}.done`, { name: outlet.name }))
      }}
    />
  )
}
