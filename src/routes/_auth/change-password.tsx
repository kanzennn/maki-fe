import { createFileRoute } from '@tanstack/react-router'

import { ChangePasswordPage } from '@/features/auth/components/ChangePasswordPage'

export const Route = createFileRoute('/_auth/change-password')({
  component: ChangePasswordPage,
})
