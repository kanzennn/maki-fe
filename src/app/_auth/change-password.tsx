import { createFileRoute } from '@tanstack/react-router'

import { ChangePasswordPage } from './_components/change-password-page'

export const Route = createFileRoute('/_auth/change-password')({
  component: ChangePasswordPage,
})
