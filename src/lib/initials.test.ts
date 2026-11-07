import { describe, expect, it } from 'vitest'

import { initialsOf } from './initials'

describe('initialsOf', () => {
  it('takes the first and last words', () => {
    expect(initialsOf('Rina')).toBe('R')
    expect(initialsOf('siti rahma')).toBe('SR')
    expect(initialsOf('  Siti   Nur  Rahma ')).toBe('SR')
  })

  it('never splits a character, and copes with nothing', () => {
    expect(initialsOf('😀 Budi')).toBe('😀B')
    expect(initialsOf('   ')).toBe('')
  })
})
