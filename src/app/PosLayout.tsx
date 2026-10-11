import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { floorQuery } from '@/features/pos/api'
import { PrintProvider } from '@/features/pos/components/PrintProvider'
import { BottomSlotContext } from '@/features/pos/frame-context'
import { can } from '@/shared/lib/permissions'
import { useSession } from '@/shared/lib/session'

import { NavLink } from './NavLink'
import { posNavItems } from './navigation'

const route = getRouteApi('/_auth/pos')

/**
 * The cashier's frame (DESIGN.md): from 840px wide the icon sidebar, and the
 * page filling the rest of the screen, so the sell page's columns scroll on
 * their own and its pay button stays in view; below it a bottom navigation
 * bar with the same items, and above that bar the cart bar when the sell
 * page has one. Receipts print from here, whichever page asks. Tables are
 * in the navigation when the outlet has some: the floor, loaded here for
 * whoever sells, says, and has none where the outlet seats its customers
 * by number stands.
 */
export function PosLayout() {
  const { t } = useTranslation('pos')
  const user = useSession((s) => s.user)
  const { outletId } = route.useRouteContext()
  const floor = useQuery({ ...floorQuery(outletId), enabled: can(user, 'checkout.create') })
  const items = posNavItems(user, (floor.data?.areas.length ?? 0) > 0)
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)

  return (
    <PrintProvider>
      <BottomSlotContext value={slot}>
        <div className="flex-1 expanded:flex expanded:h-[calc(100dvh_-_var(--app-header))] expanded:flex-none">
          <div className="hidden w-24 shrink-0 overflow-y-auto border-r border-outline bg-surface expanded:block">
            <nav aria-label={t('nav.label')} className="py-4">
              <ul className="grid gap-2 px-2">
                {items.map((item) => (
                  <li key={item.key}>
                    <NavLink item={item} underline />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <main className="min-w-0 flex-1 pb-28 expanded:overflow-y-auto expanded:pb-0">
            <Outlet />
          </main>
          <div className="fixed inset-x-0 bottom-0 z-40 expanded:hidden">
            <div ref={setSlot} />
            <nav
              aria-label={t('nav.label')}
              className="border-t border-outline bg-surface pb-[env(safe-area-inset-bottom)]"
            >
              <ul className="flex">
                {items.map((item) => (
                  <li key={item.key} className="min-w-0 flex-1">
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </BottomSlotContext>
    </PrintProvider>
  )
}
