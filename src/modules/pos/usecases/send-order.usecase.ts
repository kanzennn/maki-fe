import { ApiError } from '@/lib/http'

import * as orderRepository from '../repositories/order.repository'
import type { CreateOrderRequest, Outcome } from '../types'

/** The waits before each automatic resend of an order with no answer; tests shorten them. */
export const resendDelays = [1000, 3000]

/**
 * An answer that settles an order: a 4xx. A 5xx may come after the server
 * saved it, and no answer at all (status 0) says nothing either way.
 */
export function settles(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

/**
 * Sends the order until an answer settles it: with no answer, or a 5xx, it
 * goes again by itself after each of resendDelays, always exactly as it was
 * — the same order sent again is answered with it as it was taken, never a
 * second one — and then it's unknown.
 */
export async function sendOrder(outletId: string, order: CreateOrderRequest): Promise<Outcome> {
  for (let attempt = 0; ; attempt++) {
    try {
      return { kind: 'sold', order: await orderRepository.createOrder(outletId, order) }
    } catch (error) {
      if (settles(error)) return { kind: 'refused', error }
      if (attempt >= resendDelays.length) return { kind: 'unknown', error }
      await new Promise((resolve) => setTimeout(resolve, resendDelays[attempt]))
    }
  }
}
