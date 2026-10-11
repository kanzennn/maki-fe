const letters = 'abcdefghijklmnopqrstuvwxyz'
const alphabet = letters + '0123456789'

/**
 * An order's ID, made here as the backend makes its own: the shape of a
 * CUID2, a lowercase letter then lowercase letters and digits, 24 in all,
 * from the browser's cryptographic random numbers. 23 random characters of 36
 * leave a collision out of reach. The ID is the order's idempotency key, so
 * an order keeps it for every resend.
 */
export function newOrderId(): string {
  let id = ''
  while (id.length < 24) {
    for (const byte of crypto.getRandomValues(new Uint8Array(32))) {
      if (id.length === 24) break
      const set = id.length === 0 ? letters : alphabet
      // 256 isn't a multiple of 26 or 36: dropping the top bytes keeps every
      // character equally likely.
      if (byte < 256 - (256 % set.length)) id += set[byte % set.length]
    }
  }
  return id
}
