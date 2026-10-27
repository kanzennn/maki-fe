import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { NavItem } from './navigation'

/**
 * A navigation item (DESIGN.md sidebar-nav): an icon over its label. Active:
 * the icon on a primary-container-strong pill, icon and label in
 * primary-strong, and in the sidebar a short primary bar under it. The admin
 * area's frame and the cashier's share it.
 */
export function NavLink({ item, underline = false }: { item: NavItem; underline?: boolean }) {
  const { t } = useTranslation()
  const Icon = item.icon

  return (
    <Link
      {...item.link}
      activeOptions={{ exact: item.exact }}
      className="group grid min-h-14 justify-items-center gap-1 rounded-field py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low data-[status=active]:text-primary-strong"
    >
      <span className="grid h-8 w-14 place-items-center rounded-field group-data-[status=active]:bg-primary-container-strong">
        <Icon aria-hidden="true" className="size-5 text-icon-muted group-data-[status=active]:text-primary-strong" />
      </span>
      <span className="max-w-full truncate">{t(`nav.${item.key}`)}</span>
      {underline && <span aria-hidden="true" className="h-0.5 w-4 rounded-full group-data-[status=active]:bg-primary" />}
    </Link>
  )
}
