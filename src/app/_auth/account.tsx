import { createFileRoute } from '@tanstack/react-router'

import { AccountPage } from './_components/account-page'

export const Route = createFileRoute('/_auth/account')({
  component: AccountPage,
})
