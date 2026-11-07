import { describe, expect, it } from 'vitest'

import { MAX_UPLOAD_BYTES } from '../types'
import { photoProblem } from './photo.validation'

const fileOf = (size: number, type: string) => new File([new Uint8Array(size)], 'photo', { type })

describe('photoProblem', () => {
  it('takes a JPG, PNG or WebP of up to 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(photoProblem(fileOf(MAX_UPLOAD_BYTES, type))).toBeNull()
    }
  })

  it('refuses any other type', () => {
    expect(photoProblem(fileOf(10, 'image/svg+xml'))).toBe('type')
    expect(photoProblem(fileOf(10, 'image/gif'))).toBe('type')
    expect(photoProblem(fileOf(10, ''))).toBe('type')
  })

  it('refuses an empty file and one over the limit', () => {
    expect(photoProblem(fileOf(0, 'image/png'))).toBe('size')
    expect(photoProblem(fileOf(MAX_UPLOAD_BYTES + 1, 'image/png'))).toBe('size')
  })
})
