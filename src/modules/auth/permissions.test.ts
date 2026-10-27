import { describe, expect, it } from 'vitest'

import { testOwner, testUser } from '@/test/fixtures'

import { can, holdsAll } from './permissions'
import { listSearch } from '@/lib/list-search'

describe('can', () => {
  it("answers from the user's permissions, never from their role's name", () => {
    expect(can(testUser, 'checkout.create')).toBe(true)
    expect(can(testUser, 'user.view')).toBe(false)
    expect(can(testOwner, 'user.manage')).toBe(true)
    expect(can(testOwner, 'checkout.create')).toBe(false)
  })

  it('says no without a user', () => {
    expect(can(null, 'dashboard.view')).toBe(false)
  })
})

describe('holdsAll', () => {
  it('needs every code', () => {
    expect(holdsAll(testOwner, ['user.view', 'role.view'])).toBe(true)
    expect(holdsAll(testOwner, ['user.view', 'role.manage'])).toBe(false)
    expect(holdsAll(testUser, [])).toBe(true)
  })
})

describe('listSearch', () => {
  it('keeps a search and a page from the second on', () => {
    expect(listSearch({ q: 'kopi', page: 2 })).toEqual({ q: 'kopi', page: 2 })
    expect(listSearch({ q: 123 })).toEqual({ q: '123', page: undefined })
  })

  it('drops anything it cannot send', () => {
    expect(listSearch({ q: '  ', page: 1 })).toEqual({ q: undefined, page: undefined })
    expect(listSearch({ q: ['a'], page: 2.5 })).toEqual({ q: undefined, page: undefined })
    expect(listSearch({ page: '3' })).toEqual({ q: undefined, page: undefined })
  })
})
