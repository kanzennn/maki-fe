import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from './_components/reset-password-page'

// Opened from the reset email: /reset-password#token=…
export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})
