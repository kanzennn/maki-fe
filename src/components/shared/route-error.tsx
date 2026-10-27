import type { ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'

import { PageHeading } from './page-heading'

/**
 * The root error boundary. It shows a generic message and, for API errors,
 * the request ID to quote to support — never the error itself or a stack.
 */
export function RouteError({ error }: ErrorComponentProps) {
  const { t } = useTranslation()
  const requestId = error instanceof ApiError ? error.requestId : undefined

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <section className="w-full max-w-md rounded-card border border-outline bg-surface p-6">
        <PageHeading>{t('error.title')}</PageHeading>
        <p className="mt-2 text-on-surface-variant">{t('error.body')}</p>
        {requestId && (
          <p className="mt-4 text-label-sm text-on-surface-variant">{t('error.requestId', { id: requestId })}</p>
        )}
      </section>
    </main>
  )
}
