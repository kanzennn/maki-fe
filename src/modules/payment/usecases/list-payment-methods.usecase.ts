import * as paymentRepository from '../repositories/payment.repository'
import type { PaymentControlMethod } from '../types'

export function listPaymentMethods(outletId: string): Promise<PaymentControlMethod[]> {
  return paymentRepository.listPaymentMethods(outletId)
}
