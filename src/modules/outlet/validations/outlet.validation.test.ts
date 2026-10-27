import { describe, expect, it } from 'vitest'

import { ValidationError } from '@/lib/validation'

import type { OutletFormValues } from '../types'
import { confirmsOutletName, validateOutletDeletion, validateOutletForm } from './outlet.validation'

const valid: OutletFormValues = {
  code: 'BDG01',
  name: 'Maki',
  address: '',
  phone: '',
  timezone: 'Asia/Jakarta',
  locale: 'id',
  open_time: '',
  close_time: '',
  tax_pct: '0',
  service_pct: '0',
}

/** The rule each field broke, as the form shows them. */
function broken(values: Partial<OutletFormValues>): Record<string, string> {
  try {
    validateOutletForm({ ...valid, ...values })
    return {}
  } catch (error) {
    if (error instanceof ValidationError) return { ...error.fields }
    throw error
  }
}

describe('validateOutletForm', () => {
  it('follows the server: the code is 2 to 10 letters and digits, in either case', () => {
    expect(broken({ code: 'bdg01' })).toEqual({})
    expect(broken({ code: 'B' })).toEqual({ code: 'format' })
    expect(broken({ code: 'BDG-01' })).toEqual({ code: 'format' })
  })

  it('wants both opening hours or neither, and not the same', () => {
    expect(broken({ open_time: '22:00', close_time: '02:00' })).toEqual({})
    expect(broken({ open_time: '08:00' })).toEqual({ close_time: 'required' })
    expect(broken({ close_time: '22:00' })).toEqual({ open_time: 'required' })
    expect(broken({ open_time: '08:00', close_time: '08:00' })).toEqual({ close_time: 'different' })
  })

  it('takes percentages from 0 to 100 with two decimals, with a comma or a point', () => {
    expect(broken({ tax_pct: '11', service_pct: '5,5' })).toEqual({})
    expect(broken({ tax_pct: '12.75' })).toEqual({})
    expect(broken({ tax_pct: '5,555' })).toEqual({ tax_pct: 'decimals' })
    expect(broken({ tax_pct: '101' })).toEqual({ tax_pct: 'range' })
    expect(broken({ tax_pct: 'sebelas' })).toEqual({ tax_pct: 'format' })
  })

  it('names every broken field at once', () => {
    expect(broken({ code: 'B', name: ' ', tax_pct: '101' })).toEqual({ code: 'format', name: 'required', tax_pct: 'range' })
  })

  it('sends empty fields as no value, and percentages as numbers', () => {
    const input = validateOutletForm({ ...valid, code: ' bdg01 ', name: ' Maki ', address: '  ', tax_pct: '11', service_pct: '5,5' })
    expect(input).toEqual({
      code: 'bdg01',
      name: 'Maki',
      address: null,
      phone: null,
      timezone: 'Asia/Jakarta',
      locale: 'id',
      open_time: null,
      close_time: null,
      tax_pct: 11,
      service_pct: 5.5,
    })
  })
})

describe('deleting an outlet', () => {
  const outlet = { name: 'Maki Bandung' }

  it("takes the outlet's name as the server checks it: case and all, spaces around it aside", () => {
    expect(confirmsOutletName(outlet, '  Maki Bandung ')).toBe(true)
    expect(confirmsOutletName(outlet, 'maki bandung')).toBe(false)
    expect(validateOutletDeletion(outlet, ' Maki Bandung')).toBe(' Maki Bandung')
    expect(() => validateOutletDeletion(outlet, 'Maki')).toThrow(ValidationError)
  })
})
