import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/shared/page-heading'

export function DashboardPage() {
  const { t } = useTranslation('dashboard')

  return (
    <section className="grid gap-2">
      <PageHeading>{t('title')}</PageHeading>
      <p className="text-on-surface-variant">{t('pending')}</p>
    </section>
  )
}
