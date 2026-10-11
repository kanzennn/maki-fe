import { describe, expect, it } from 'vitest'

import { toRoleInput, viewFor } from './schemas'

describe('viewFor', () => {
  it('pairs managing something with seeing it', () => {
    expect(viewFor('user.manage')).toBe('user.view')
    expect(viewFor('menu.manage')).toBe('menu.view')
    expect(viewFor('user.view')).toBeUndefined()
    expect(viewFor('checkout.create')).toBeUndefined()
  })
})

describe('toRoleInput', () => {
  it('trims, sends an empty description as none, and sorts the codes', () => {
    expect(toRoleInput({ name: ' Pelayan ', description: ' ', permissions: ['table.view', 'menu.view'] })).toEqual({
      name: 'Pelayan',
      description: null,
      permissions: ['menu.view', 'table.view'],
    })
  })
})
