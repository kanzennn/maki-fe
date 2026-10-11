import { PageError, PageNotFound, PagePending } from '@/shared/components/PageState'

/**
 * Every route's loading, error and not-found states, rendered where its page
 * would be, so the layout around it stays. The app's router and the tests'
 * routers are built with them.
 */
export const routeDefaults = {
  defaultPendingComponent: PagePending,
  defaultErrorComponent: PageError,
  defaultNotFoundComponent: PageNotFound,
}
