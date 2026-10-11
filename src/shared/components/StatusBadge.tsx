import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/ui/badge'

/** Active or inactive, in words: the tint only backs the text up. */
export function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  const { t } = useTranslation()
  return <Badge variant={status === 'active' ? 'outline' : 'secondary'}>{t(`status.${status}`)}</Badge>
}
