import { apiPath, http } from '@/lib/http'

import type { PaymentControlMethod } from '../types'

/** Every payment method of the outlet, in the cashier's order. */
export async function listPaymentMethods(outletId: string): Promise<PaymentControlMethod[]> {
  const { methods } = await http.get<{ methods: PaymentControlMethod[] }>(
    apiPath('/outlets/{oid}/payment-methods', { oid: outletId }),
  )
  return methods
}
