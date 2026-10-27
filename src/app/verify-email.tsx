import { createFileRoute } from '@tanstack/react-router'

import { VerifyEmailPage } from './_components/verify-email-page'

// Opened from the verification email: /verify-email#token=…
export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
})
