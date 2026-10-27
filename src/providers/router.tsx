import { createRouter } from '@tanstack/react-router'

import { ensureSession } from '@/modules/auth/usecases/ensure-session.usecase'
import { routeTree } from '@/routeTree.gen'
import { sessionStore } from '@/lib/session'

import { queryClient } from './query-client'
import { routeDefaults } from './route-defaults'

export const router = createRouter({
  routeTree,
  context: { queryClient, auth: { ensureSession, user: () => sessionStore.getState().user } },
  defaultPreload: 'intent',
  scrollRestoration: true,
  ...routeDefaults,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
