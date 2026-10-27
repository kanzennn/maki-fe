import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from './button'

import { PageHeading } from './page-heading'

// A route's own loading, error and not-found states. They render where the
// page would, inside its layout (the admin sidebar stays); the root route
// keeps its full-page RouteError and NotFound.

/** Shown when a page's data takes a while. */
export function PagePending() {
  const { t } = useTranslation()
  return (
    <p role="status" className="p-4 text-body-md text-on-surface-variant">
      {t('list.loading')}
    </p>
  )
}

/**
 * A page that couldn't load. A refusal from the API (a 4xx) says why in
 * words; anything else gets the generic message and the request ID to quote
 * to support — never the error itself.
 */
export function PageError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const refused = error instanceof ApiError && error.status < 500
  const requestId = error instanceof ApiError ? error.requestId : undefined

  function retry() {
    reset()
    void router.invalidate()
  }

  return (
    <section className="grid max-w-md gap-3 rounded-card border border-outline bg-surface p-6">
      <PageHeading>{t('error.title')}</PageHeading>
      <p className="text-on-surface-variant">{refused ? apiErrorMessage(t, error) : t('error.body')}</p>
      {requestId && <p className="text-label-sm text-on-surface-variant">{t('error.requestId', { id: requestId })}</p>}
      <Button variant="outline" className="h-11 justify-self-start" onClick={retry}>
        {t('actions.retry')}
      </Button>
    </section>
  )
}

/** Something the address names that doesn't exist, or no longer does. */
export function PageNotFound() {
  const { t } = useTranslation()
  return (
    <section className="grid max-w-md gap-3 rounded-card border border-outline bg-surface p-6">
      <PageHeading>{t('notFound.title')}</PageHeading>
      <p className="text-on-surface-variant">{t('notFound.gone')}</p>
      <Button asChild variant="outline" className="h-11 justify-self-start">
        <Link to="/">{t('notFound.home')}</Link>
      </Button>
    </section>
  )
}
