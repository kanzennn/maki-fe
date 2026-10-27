import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/hooks/use-session'

import { NavLink } from '@/components/layout/nav-link'
import { navItems } from '@/components/layout/navigation'

/**
 * The admin area's frame (DESIGN.md sidebar-nav): from 840px wide a narrow
 * sidebar, below it a bottom navigation bar with the same items. An item is
 * active on its page and every page under it.
 */
export function AdminLayout() {
  const { t } = useTranslation()
  const user = useSession((s) => s.user)
  const items = navItems(user)

  return (
    <div className="flex-1 expanded:flex">
      {items.length > 0 && (
        // The column runs the page's full height with its border; the nav in
        // it stays in view while the page scrolls.
        <div className="hidden w-24 shrink-0 border-r border-outline bg-surface expanded:block">
          <nav aria-label={t('nav.label')} className="sticky top-0 max-h-dvh overflow-y-auto py-4">
            <ul className="grid gap-2 px-2">
              {items.map((item) => (
                <li key={item.key}>
                  <NavLink item={item} underline />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
      <main className="min-w-0 flex-1 p-4 pb-28 expanded:p-6">
        <Outlet />
      </main>
      {items.length > 0 && (
        <nav
          aria-label={t('nav.label')}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-outline bg-surface pb-[env(safe-area-inset-bottom)] expanded:hidden"
        >
          <ul className="flex">
            {items.map((item) => (
              <li key={item.key} className="min-w-0 flex-1">
                <NavLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
