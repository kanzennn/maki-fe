import { describe, expect, it } from 'vitest'

import { ValidationError } from '@/lib/validation'

import { togglePermission, viewFor } from '../usecases/toggle-permission.usecase'
import { validateRoleForm } from './role.validation'

describe('validateRoleForm', () => {
  it('trims, sends an empty description as none, and sorts the codes', () => {
    expect(validateRoleForm({ name: ' Pelayan ', description: ' ', permissions: ['table.view', 'menu.view'] })).toEqual({
      name: 'Pelayan',
      description: null,
      permissions: ['menu.view', 'table.view'],
    })
  })

  it("names the fields that break the server's limits", () => {
    try {
      validateRoleForm({ name: ' ', description: 'x'.repeat(201), permissions: [] })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).fields).toEqual({ name: 'required', description: 'max' })
    }
  })
})

describe('viewFor', () => {
  it('pairs managing something with seeing it', () => {
    expect(viewFor('user.manage')).toBe('user.view')
    expect(viewFor('menu.manage')).toBe('menu.view')
    expect(viewFor('user.view')).toBeUndefined()
    expect(viewFor('checkout.create')).toBeUndefined()
  })
})

describe('togglePermission', () => {
  const everything = () => true

  it('ticks the view with the manage, when it may be given', () => {
    expect(togglePermission([], 'user.manage', true, everything).sort()).toEqual(['user.manage', 'user.view'])
    expect(togglePermission([], 'user.manage', true, (code) => code !== 'user.view')).toEqual(['user.manage'])
  })

  it('unticks the manage with its view, and nothing else', () => {
    expect(togglePermission(['user.view', 'user.manage', 'menu.view'], 'user.view', false, everything)).toEqual([
      'menu.view',
    ])
    expect(togglePermission(['user.view', 'user.manage'], 'user.manage', false, everything)).toEqual(['user.view'])
  })
})
