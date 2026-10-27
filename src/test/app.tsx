import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

import { routeDefaults } from '@/providers/route-defaults'
import { ensureSession } from '@/modules/auth/usecases/ensure-session.usecase'
import { routeTree } from '@/routeTree.gen'
import { sessionStore } from '@/lib/session'
import type { Me } from '@/modules/auth/types'

export const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const apiError = (status: number, code: string, details?: Record<string, unknown>) =>
  json(status, { error: { code, message: `server: ${code}`, details } })

type Handler = (request: Request) => Response | Promise<Response>

/**
 * Answers the app's API calls from routes keyed 'METHOD /path' (the query
 * string aside), and records each request. Anything else is a 404.
 */
export function serve(routes: Record<string, Handler>) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', async (request: Request) => {
    requests.push(request.clone())
    const route = routes[`${request.method} ${new URL(request.url).pathname}`]
    return route ? route(request) : apiError(404, 'not_found')
  })
  return requests
}

/** The body of the one request to path, as JSON. */
export async function bodyOf(requests: Request[], method: string, path: string): Promise<unknown> {
  const matching = requests.filter((r) => r.method === method && new URL(r.url).pathname === path)
  if (matching.length !== 1) throw new Error(`${matching.length} ${method} ${path} requests, want 1`)
  return matching[0].json()
}

/** Renders the whole app at path, signed in as user, or signed out with null. */
export function renderApp(path: string, user: Me | null) {
  sessionStore.getState().clear()
  if (user) sessionStore.getState().setSession({ access_token: 'access-1', token_type: 'Bearer', expires_in: 900, user })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient, auth: { ensureSession, user: () => sessionStore.getState().user } },
    ...routeDefaults,
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}
