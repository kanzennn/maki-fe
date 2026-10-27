import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shared/badge'

import type { VoucherStatus } from '@/modules/voucher/types'

const variants = {
  active: 'default',
  scheduled: 'outline',
  used_up: 'warning',
  expired: 'secondary',
  inactive: 'secondary',
} as const satisfies Record<VoucherStatus, 'default' | 'outline' | 'warning' | 'secondary'>

/** A voucher's status, in words: the tint only backs the text up. */
export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  const { t } = useTranslation('voucher')
  return <Badge variant={variants[status]}>{t(`status.${status}`)}</Badge>
}
