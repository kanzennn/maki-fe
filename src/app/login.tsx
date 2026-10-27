import { createFileRoute, redirect } from '@tanstack/react-router'

import { safeRedirect } from '@/modules/auth/usecases/safe-redirect.usecase'
import { LoginPage } from './_components/login-page'

export const Route = createFileRoute('/login')({
  // ?redirect= is where to go after signing in; safeRedirect keeps it in the app.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  // Someone with a live session skips the form.
  beforeLoad: async ({ context, search }) => {
    if (await context.auth.ensureSession()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})
