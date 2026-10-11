import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage'

// Opened from the reset email: /reset-password#token=…
export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})
