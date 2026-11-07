import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { json, renderApp, serve } from '@/test/app'
import { testManager, testUser } from '@/test/fixtures'

const methods = {
  methods: [
    { method: 'cash', is_enabled: true, available: true },
    { method: 'qris', is_enabled: false, available: false },
    { method: 'debit', is_enabled: false, available: false },
  ],
}

describe('Payment Control', () => {
  it('shows cash on and locked, and the others coming soon', async () => {
    serve({ 'GET /api/v1/outlets/o1/payment-methods': () => json(200, methods) })
    renderApp('/admin/outlets/o1/payment-methods', testManager)

    const cash = await screen.findByRole('checkbox', { name: /Tunai/ })
    expect(cash).toBeChecked()
    expect(cash).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /QRIS/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Debit/ })).toBeDisabled()
    expect(screen.getAllByText('Segera hadir')).toHaveLength(2)
  })

  it('is closed to whoever lacks payment.manage', async () => {
    serve({})
    const { router } = renderApp('/admin/outlets/o1/payment-methods', testUser)

    await screen.findByRole('heading', { level: 1 })
    expect(router.state.location.pathname).not.toContain('payment-methods')
  })
})
