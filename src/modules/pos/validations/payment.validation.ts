import { MAX_RECEIVED } from '../types'

/** Whether the cash received covers the total, within what one payment takes in. */
export function covers(received: number, total: number): boolean {
  return received >= total && received <= MAX_RECEIVED
}
