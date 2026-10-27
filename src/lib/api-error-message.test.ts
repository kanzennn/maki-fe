import i18n from 'i18next'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/http'

import { apiErrorMessage } from './api-error-message'

const t = i18n.t.bind(i18n)
const apiError = (code: string, message: string) => new ApiError(400, { error: { code, message } })

describe('apiErrorMessage', () => {
  it('translates a known code instead of showing the server message', () => {
    expect(apiErrorMessage(t, apiError('not_ready', 'The service is not ready yet.'))).toBe(
      'Layanan sedang tidak tersedia. Coba lagi sebentar lagi.',
    )
  })

  it("falls back to the server message for a code the app can't translate yet", () => {
    // The missing key is reported in development on purpose.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(apiErrorMessage(t, apiError('shift_not_open', 'No shift is open on this device.'))).toBe(
      'No shift is open on this device.',
    )
  })

  it('fills the translation from the error details', () => {
    const tooShort = new ApiError(422, { error: { code: 'password_too_short', message: '', details: { min: 8 } } })
    expect(apiErrorMessage(t, tooShort)).toBe('Password minimal 8 karakter.')
  })

  it('gives a rate limit wait in whole minutes', async () => {
    const limited = (seconds: number) =>
      new ApiError(429, { error: { code: 'rate_limited', message: '', details: { retry_after: seconds } } })
    expect(apiErrorMessage(t, limited(840))).toBe('Terlalu banyak percobaan. Coba lagi dalam 14 menit.')
    await i18n.changeLanguage('en')
    expect(apiErrorMessage(t, limited(30))).toBe('Too many attempts. Try again in 1 minute.')
    expect(apiErrorMessage(t, limited(125))).toBe('Too many attempts. Try again in 3 minutes.')
  })

  it('reports a network failure for anything that is not an API error', () => {
    expect(apiErrorMessage(t, new TypeError('Failed to fetch'))).toBe(
      'Tidak bisa terhubung ke server. Periksa koneksi internet.',
    )
  })
})
