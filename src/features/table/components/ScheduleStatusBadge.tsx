import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/ui/badge'

import type { ScheduleStatus } from '../api'

const variants = {
  upcoming: 'outline',
  ongoing: 'default',
  finished: 'secondary',
  cancelled: 'secondary',
} as const satisfies Record<ScheduleStatus, 'default' | 'outline' | 'secondary'>

/** A schedule's status, in words: the tint only backs the text up. */
export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const { t } = useTranslation('table')
  return <Badge variant={variants[status]}>{t(`schedules.status.${status}`)}</Badge>
}
