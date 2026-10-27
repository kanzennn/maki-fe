import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormNotice } from '@/components/shared/form-message'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { formatDateTime } from '@/lib/time'
import { Badge } from '@/components/shared/badge'
import { Button } from '@/components/shared/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import { deviceListQuery, useRevokeDevice } from '@/hooks/device/device.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import type { Device } from '@/modules/device/types'

const route = getRouteApi('/_auth/admin/outlets/$oid/devices')

/**
 * An outlet's cashier devices, for its Manager and the Owner: who activated
 * each, when it was last used, and revoking one. A device is added on the
 * device itself, from the cashier, so this page says how.
 */
export function DeviceListPage() {
  const { t, i18n } = useTranslation('device')
  const { oid } = route.useParams()
  const { state: search, setPage } = useUrlListState(route)
  const timeZone = route.useRouteContext({ select: (c) => c.outlet.timezone })
  const { data } = useSuspenseQuery(deviceListQuery(oid, search))
  const [notice, setNotice] = useState<string | null>(null)
  const when = (iso: string) => formatDateTime(iso, i18n.language, timeZone)

  return (
    <div className="grid gap-6">
      <PageHeader title={t('title')} description={t('intro')} />
      {notice && <FormNotice>{notice}</FormNotice>}
      {data.items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('empty')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-outline bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.code')}</TableHead>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('columns.platform')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead className="hidden expanded:table-cell">{t('columns.activated')}</TableHead>
                  <TableHead className="hidden expanded:table-cell">{t('columns.lastSeen')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((device) => (
                  <TableRow key={device.device_id}>
                    <TableCell className="text-title-md">{device.code}</TableCell>
                    <TableCell>
                      <span className="grid">
                        <span>{device.name}</span>
                        {device.revoked_at && device.revoked_by && (
                          <span className="text-label-sm text-on-surface-variant">
                            {t('revoked', { date: when(device.revoked_at), name: device.revoked_by.name })}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{t(`platform.${device.platform}`)}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                        {t(`status.${device.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden expanded:table-cell">
                      {t('activated', { date: when(device.activated_at), name: device.activated_by.name })}
                    </TableCell>
                    <TableCell className="hidden expanded:table-cell">
                      {device.last_seen_at ? when(device.last_seen_at) : t('never')}
                    </TableCell>
                    <TableCell className="text-right">
                      {device.status === 'active' && <RevokeButton outletId={oid} device={device} onDone={setNotice} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination list={data} onPage={setPage} />
        </>
      )}
    </div>
  )
}

function RevokeButton({
  outletId,
  device,
  onDone,
}: {
  outletId: string
  device: Device
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('device')
  const revoke = useRevokeDevice(outletId)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="h-11 text-error" aria-label={t('revoke.label', { name: device.name })}>
          {t('revoke.action')}
        </Button>
      }
      title={t('revoke.title', { name: device.name })}
      description={t('revoke.body', { code: device.code })}
      confirmLabel={t('revoke.confirm')}
      destructive
      onConfirm={async () => {
        await revoke.mutateAsync(device.device_id)
        onDone(t('revoke.done', { name: device.name }))
      }}
    />
  )
}
