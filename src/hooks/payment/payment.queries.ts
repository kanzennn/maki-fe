import { queryOptions } from '@tanstack/react-query'

import { listPaymentMethods } from '@/modules/payment/usecases/list-payment-methods.usecase'

/** The outlet's Payment Control. */
export const paymentMethodsQuery = (outletId: string) =>
  queryOptions({
    queryKey: ['payment-methods', outletId] as const,
    queryFn: () => listPaymentMethods(outletId),
  })
