import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'

import { sessionStore } from '@/lib/session'
import { isLanguage } from '@/lib/language'

import i18n from './i18n'
import { queryClient } from './query-client'
import { router } from './router'

export function Providers() {
  // Once signed in, the user's own language — stored on the server, the
  // same on every device — replaces the one picked before sign-in.
  useEffect(
    () =>
      sessionStore.subscribe((state, previous) => {
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
