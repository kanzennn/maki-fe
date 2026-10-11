import { createRouter } from '@tanstack/react-router'

import { ensureSession } from '@/features/auth/api'
import { routeTree } from '@/routeTree.gen'
import { useSession } from '@/shared/lib/session'

import { queryClient } from './query-client'
import { routeDefaults } from './route-defaults'

export const router = createRouter({
  routeTree,
  context: { queryClient, auth: { ensureSession, user: () => useSession.getState().user } },
  defaultPreload: 'intent',
  scrollRestoration: true,
  ...routeDefaults,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
