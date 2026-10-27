import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'

import { RootLayout } from './_components/root-layout'
import { NotFound } from '@/components/shared/not-found'
import { RouteError } from '@/components/shared/route-error'
import type { Me } from '@/modules/auth/types'

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
