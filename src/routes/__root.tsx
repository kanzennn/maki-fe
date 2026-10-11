import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'

import { RootLayout } from '@/app/RootLayout'
import { NotFound } from '@/shared/components/NotFound'
import { RouteError } from '@/shared/components/RouteError'
import type { Me } from '@/shared/lib/session'

export type RouterContext = {
  queryClient: QueryClient
  auth: {
    /** Whether a session exists, restoring it from the refresh cookie if needed. */
    ensureSession: () => Promise<boolean>
    /** The signed-in user, once ensureSession has resolved true. */
    user: () => Me | null
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
})
