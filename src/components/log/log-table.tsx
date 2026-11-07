import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shared/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'
import { formatDateTime } from '@/lib/time'
import type { ActionLog } from '@/modules/log/types'
import { changes, targetName } from '@/modules/log/usecases/describe-entry.usecase'

/** The Log Action's rows: an action shows by its label, or as recorded when it has none. */
export function LogTable({ entries, timeZone, showOutlet }: { entries: ActionLog[]; timeZone: string; showOutlet: boolean }) {
  const { t, i18n } = useTranslation('log')
  return (
    <div className="overflow-x-auto rounded-card border border-outline bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.when')}</TableHead>
            <TableHead>{t('columns.user')}</TableHead>
            {showOutlet && <TableHead className="hidden sm:table-cell">{t('columns.outlet')}</TableHead>}
            <TableHead>{t('columns.action')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('columns.target')}</TableHead>
            <TableHead className="hidden expanded:table-cell">{t('columns.source')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('columns.detail')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.action_log_id}>
              <TableCell className="whitespace-nowrap">{formatDateTime(entry.occurred_at, i18n.language, timeZone)}</TableCell>
              <TableCell>
                <UserCell entry={entry} />
              </TableCell>
              {showOutlet && <TableCell className="hidden sm:table-cell">{entry.outlet?.name ?? t('none')}</TableCell>}
              <TableCell>{actionLabel(t, entry.action)}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <Target entry={entry} />
              </TableCell>
              <TableCell className="hidden expanded:table-cell">{source(entry) ?? t('none')}</TableCell>
              <TableCell className="text-right">
                <EntryDetail entry={entry} timeZone={timeZone} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function actionLabel(t: ReturnType<typeof useTranslation<'log'>>['t'], action: string) {
  return t(`actions.${action}` as never, { defaultValue: action })
}

function source(entry: ActionLog) {
  const device = entry.device && `${entry.device.code} · ${entry.device.name}`
  return [entry.ip, device].filter(Boolean).join(' · ') || null
}

function UserCell({ entry }: { entry: ActionLog }) {
  const { t } = useTranslation('log')
  if (!entry.user) return <span className="text-on-surface-variant">{t('nobody')}</span>
  const { user } = entry
  const role = user.is_owner ? t('role.owner') : user.is_manager ? t('role.manager') : (user.role_name ?? t('role.staff'))
  return (
    <span className="grid">
      <span>{user.name}</span>
      <span className="text-label-sm text-on-surface-variant">{role}</span>
    </span>
  )
}

function Target({ entry }: { entry: ActionLog }) {
  const { t } = useTranslation('log')
  if (!entry.target_type) return <>{t('none')}</>
  const type = t(`targets.${entry.target_type}` as never, { defaultValue: entry.target_type })
  const name = targetName(entry)
  return <>{name ? `${type}: ${name}` : type}</>
}

function EntryDetail({ entry, timeZone }: { entry: ActionLog; timeZone: string }) {
  const { t, i18n } = useTranslation('log')
  const rows = changes(entry)
  const label = actionLabel(t, entry.action)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11" aria-label={t('detail.open', { action: label })}>
          {t('columns.detail')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <p className="text-body-md text-on-surface-variant">
            <Target entry={entry} /> · {formatDateTime(entry.occurred_at, i18n.language, timeZone)}
            <br />
            {t('detail.recordedAt')}: {formatDateTime(entry.created_at, i18n.language, timeZone)}
          </p>
          {rows.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">{t('detail.noChanges')}</p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-card border border-outline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail.field')}</TableHead>
                    <TableHead>{t('detail.before')}</TableHead>
                    <TableHead>{t('detail.after')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.field}>
                      <TableCell className="text-title-md">{row.field}</TableCell>
                      <TableCell className="break-words whitespace-normal">{row.before}</TableCell>
                      <TableCell className="break-words whitespace-normal">{row.after}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
