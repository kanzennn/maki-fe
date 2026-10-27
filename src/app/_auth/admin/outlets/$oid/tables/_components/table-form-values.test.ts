import { describe, expect, it } from 'vitest'

import { testA1 } from '@/test/tables'

import { tableFormValues } from './table-form-values'

describe('tableFormValues', () => {
  it('starts from the table, or a new one in the area', () => {
    expect(tableFormValues(testA1)).toEqual({ name: 'A1', area_id: 'a-in', capacity: '4', shape: 'square', is_active: true })
    expect(tableFormValues(undefined, 'a-out')).toEqual({ name: '', area_id: 'a-out', capacity: '', shape: 'square', is_active: true })
  })
})
