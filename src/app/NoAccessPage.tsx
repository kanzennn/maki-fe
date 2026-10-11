import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/shared/components/PageHeading'

/**
 * For a signed-in user whose permissions open no page here yet, such as a
 * role with only the menu permissions before the menu module exists. The
 * header's sign-out stays available.
 */
export function NoAccessPage() {
  const { t } = useTranslation()

  return (
    <section className="grid max-w-md gap-2">
      <PageHeading>{t('noAccess.title')}</PageHeading>
      <p className="text-on-surface-variant">{t('noAccess.body')}</p>
    </section>
  )
}
