import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from './button'

import { PageHeading } from './page-heading'

export function NotFound() {
  const { t } = useTranslation()

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <section className="w-full max-w-md rounded-card border border-outline bg-surface p-6">
        <PageHeading>{t('notFound.title')}</PageHeading>
        <p className="mt-2 text-on-surface-variant">{t('notFound.body')}</p>
        <Button asChild className="mt-6">
          <Link to="/">{t('notFound.home')}</Link>
        </Button>
      </section>
    </main>
  )
}
