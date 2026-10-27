import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseOrThrow, ValidationError } from '@/lib/validation'

import { validationResolver } from './validation-resolver'

type Values = { name: string; items: { qty: string }[] }

const schema = z.object({
  name: z.string().trim().min(1, 'required'),
  items: z.array(z.object({ qty: z.string().min(1, 'required') })),
})
const validate = (values: Values) => parseOrThrow(schema, values)
const resolve = (values: Values) =>
  validationResolver(validate)(values, undefined, { fields: {}, shouldUseNativeValidation: false })

describe('validationResolver', () => {
  it('passes valid values on as typed', async () => {
    const values = { name: ' Kopi ', items: [{ qty: '1' }] }
    expect(await resolve(values)).toEqual({ values, errors: {} })
  })

  it('names every broken field at once, nested ones by their path', async () => {
    const result = await resolve({ name: ' ', items: [{ qty: '1' }, { qty: '' }] })
    expect(result.values).toEqual({})
    expect(result.errors).toEqual({
      name: { type: 'validate', message: 'required' },
      items: { 1: { qty: { type: 'validate', message: 'required' } } },
    })
  })

  it('lets any other error through', () => {
    const broken = validationResolver<Values>(() => {
      throw new TypeError('a bug')
    })
    expect(() => broken({ name: '', items: [] }, undefined, { fields: {}, shouldUseNativeValidation: false })).toThrow(
      TypeError,
    )
  })
})

describe('parseOrThrow', () => {
  it("throws a ValidationError with each field's first broken rule", () => {
    const strict = z.object({ code: z.string().min(1, 'required').regex(/^[A-Z]+$/, 'format') })
    expect(() => parseOrThrow(strict, { code: '' })).toThrow(ValidationError)
    try {
      parseOrThrow(strict, { code: '' })
    } catch (error) {
      expect((error as ValidationError).fields).toEqual({ code: 'required' })
      expect((error as ValidationError).message).toBe('invalid input: code required')
    }
  })
})
