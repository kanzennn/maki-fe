import 'i18next'

import type auth from '@/locales/id/auth.json'
import type common from '@/locales/id/common.json'
import type dashboard from '@/locales/id/dashboard.json'
import type device from '@/locales/id/device.json'
import type menu from '@/locales/id/menu.json'
import type outlet from '@/locales/id/outlet.json'
import type pos from '@/locales/id/pos.json'
import type role from '@/locales/id/role.json'
import type table from '@/locales/id/table.json'
import type user from '@/locales/id/user.json'
import type voucher from '@/locales/id/voucher.json'

// Typed translation keys: t('title') fails to compile when the key doesn't
// exist. Indonesian is the default language, so its files define the keys;
// add each new namespace here.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      dashboard: typeof dashboard
      device: typeof device
      menu: typeof menu
      outlet: typeof outlet
      pos: typeof pos
      role: typeof role
      table: typeof table
      user: typeof user
      voucher: typeof voucher
    }
  }
}
