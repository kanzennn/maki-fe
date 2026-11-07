import { createFileRoute, redirect } from '@tanstack/react-router'

import { paymentMethodsQuery } from '@/hooks/payment/payment.queries'
import { canManagePayments } from '@/modules/payment/permissions'

import { PaymentMethodsPage } from './_components/payment-methods-page'

// The outlet's Payment Control, for whoever holds payment.manage.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/payment-methods')({
  beforeLoad: ({ context }) => {
    if (!canManagePayments(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(paymentMethodsQuery(params.oid)),
  component: PaymentMethodsPage,
})
