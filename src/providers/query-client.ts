import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/http'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A 4xx won't change on retry; server errors and network failures
      // get two more tries.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})
