import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('keeps a custom text size next to a text colour', () => {
    expect(cn('text-body-md text-on-surface')).toBe('text-body-md text-on-surface')
  })

  it('still resolves real conflicts', () => {
    expect(cn('text-on-surface', 'text-primary')).toBe('text-primary')
    expect(cn('text-body-md', 'text-label-md')).toBe('text-label-md')
    expect(cn('rounded-card', 'rounded-tile')).toBe('rounded-tile')
  })
})
