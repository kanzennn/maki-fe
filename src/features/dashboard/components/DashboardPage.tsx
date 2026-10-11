import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/shared/components/PageHeading'

export function DashboardPage() {
  const { t } = useTranslation('dashboard')

  return (
    <section className="grid gap-2">
      <PageHeading>{t('title')}</PageHeading>
      <p className="text-on-surface-variant">{t('pending')}</p>
    </section>
  )
}
