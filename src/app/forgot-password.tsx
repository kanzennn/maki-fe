import { createFileRoute } from '@tanstack/react-router'

import { ForgotPasswordPage } from './_components/forgot-password-page'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})
