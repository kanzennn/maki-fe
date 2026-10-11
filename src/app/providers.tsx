import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'

import { isLanguage } from '@/shared/lib/language'
import { useSession } from '@/shared/lib/session'

import i18n from './i18n'
import { queryClient } from './query-client'
import { router } from './router'

export function Providers() {
  // Once signed in, the user's own language — stored on the server, the
  // same on every device — replaces the one picked before sign-in.
  useEffect(
    () =>
      useSession.subscribe((state, previous) => {
        const language = state.user?.language
        if (language !== previous.user?.language && isLanguage(language)) void i18n.changeLanguage(language)
      }),
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
