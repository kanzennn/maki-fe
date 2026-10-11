import { apiError, json } from './app'

/**
 * The cashier's API on a device outlet o1 hasn't activated: what a cashier
 * opening /pos meets first, for tests that only need to land there. The
 * outlet has no tables.
 */
export function unregisteredTill() {
  return {
    'GET /api/v1/outlets/o1/pos/device': () => apiError(403, 'device_not_registered'),
    'GET /api/v1/outlets/o1/pos/tables': () => json(200, { areas: [] }),
    'GET /api/v1/outlets/o1/pos/catalog': () =>
      json(200, {
        outlet: {
          outlet_id: 'o1',
          code: 'BDG01',
          name: 'Maki Bandung',
          address: null,
          phone: null,
          timezone: 'Asia/Jakarta',
          locale: 'id',
          tax_bps: 0,
          service_bps: 0,
        },
        payment_methods: ['cash'],
        categories: [],
        menus: [],
      }),
  }
}
