import { describe, expect, it } from 'vitest'

import { MAX_STAND, standNumber, validStand } from './stand'

describe("a stand's number", () => {
  it('is kept as the server keeps it: no spaces at its ends, in capitals', () => {
    expect(standNumber('  a5 ')).toBe('A5')
    expect(standNumber('b-3')).toBe('B-3')
    expect(standNumber('12')).toBe('12')
  })

  it.each(['1', '12', 'A5', 'b-3', ' 7 ', 'B--3', 'ABCDEFGHIJ'])('takes %j', (typed) => {
    expect(validStand(typed)).toBe(true)
  })

  it.each(['', '   ', '-', '-3', '3-', 'A 5', '12.', '#1', 'É1', 'ABCDEFGHIJK'])("doesn't take %j", (typed) => {
    expect(validStand(typed)).toBe(false)
  })

  it('has at most as many characters as the server takes', () => {
    expect(MAX_STAND).toBe(10)
    expect(validStand('9'.repeat(MAX_STAND))).toBe(true)
    expect(validStand('9'.repeat(MAX_STAND + 1))).toBe(false)
  })
})
