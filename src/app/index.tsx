import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    if (await context.auth.ensureSession()) throw redirect({ to: '/admin' })
    throw redirect({ to: '/login', search: {} })
  },
})
