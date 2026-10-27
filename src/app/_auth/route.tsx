import { createFileRoute, redirect } from '@tanstack/react-router'

import { SignedInLayout } from './_components/signed-in-layout'

// Every screen under this layout needs a session: from memory, or restored
// from the refresh cookie after a reload. A user who must change their
// password is held on /change-password. Permission checks for each area
// (admin, pos) attach to their own routes; the backend enforces them
// regardless.
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    if (!(await context.auth.ensureSession())) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    if (context.auth.user()?.must_change_password && location.pathname !== '/change-password') {
      throw redirect({ to: '/change-password' })
    }
  },
  component: SignedInLayout,
})
