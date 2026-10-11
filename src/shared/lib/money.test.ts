import { describe, expect, it } from 'vitest'

import { formatRupiah } from './money'

// Intl puts a non-breaking space after "Rp".
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('formatRupiah', () => {
  it('uses the separators of the language and no decimals', () => {
    expect(plain(formatRupiah(25_000, 'id'))).toBe('Rp 25.000')
    expect(plain(formatRupiah(25_000, 'en'))).toBe('Rp 25,000')
    expect(plain(formatRupiah(0, 'id'))).toBe('Rp 0')
  })

  it('rejects amounts that are not integers', () => {
    expect(() => formatRupiah(10.5, 'id')).toThrow(RangeError)
  })
})
