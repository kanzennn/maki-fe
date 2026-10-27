import { describe, expect, it } from 'vitest'

import { testManager, testManagerStaff, testOwner, testRoles, testStaff, testSupervisor, testUser } from '@/test/fixtures'

import { grantableRoles, manageMode } from './permissions'

// The server's rules (user/staff.go lockManaged), which the page mirrors.
describe('manageMode', () => {
  const dapur = { ...testStaff, user_id: 'u2', role: { role_id: 'r-dapur', name: 'Dapur' } }

  it.each([
    ['nobody without user.manage', testUser, testStaff, 'view'],
    ['nobody their own account', testManager, testManagerStaff, 'own'],
    ['the Owner, a Manager', testOwner, testManagerStaff, 'manage'],
    ['the Owner, staff only to promote them', testOwner, testStaff, 'promote'],
    ['a Manager, staff', testManager, testStaff, 'manage'],
    ['a Manager, not another Manager', testManager, { ...testManagerStaff, user_id: 'm2' }, 'managerAccount'],
    ['a supervisor, staff whose role they hold all of', testSupervisor, testStaff, 'manage'],
    ['a supervisor, not staff with a permission they lack', testSupervisor, dapur, 'stronger'],
  ] as const)('lets %s', (_, actor, target, mode) => {
    expect(manageMode(actor, target, testRoles)).toBe(mode)
  })

  it('leaves a role it cannot see to the server', () => {
    expect(manageMode(testSupervisor, { ...testStaff, role: { role_id: 'r-unknown', name: 'Baru' } }, testRoles)).toBe(
      'manage',
    )
  })
})

describe('grantableRoles', () => {
  it('offers only roles that hold nothing the giver lacks', () => {
    expect(grantableRoles(testSupervisor, testRoles).map((r) => r.name)).toEqual(['Kasir'])
    expect(grantableRoles(testManager, testRoles).map((r) => r.name)).toEqual(['Kasir', 'Dapur'])
  })
})
