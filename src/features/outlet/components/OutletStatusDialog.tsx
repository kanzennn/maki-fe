import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/ui/button'

import { useSetOutletStatus, type Outlet } from '../api'

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
