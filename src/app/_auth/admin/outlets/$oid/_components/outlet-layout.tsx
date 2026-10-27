import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, linkOptions, Outlet, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/shared/page-header'
import { NestedPageHeadings, PageHeading } from '@/components/shared/page-heading'
import { StatusBadge } from '@/components/shared/status-badge'
import { useSession } from '@/hooks/use-session'
import { Badge } from '@/components/shared/badge'

import { outletQuery } from '@/hooks/outlet/outlet.queries'

/**
 * The pages of one outlet. The Owner sees them under the outlet's name, with
 * tabs for its details, users, roles, menu, tables, devices and vouchers; a
 * Manager's own outlet needs no frame, the sidebar leads there.
 */
export function OutletLayout() {
  const isOwner = useSession((s) => s.user?.is_owner ?? false)
  return isOwner ? <OwnerFrame /> : <Outlet />
}

function OwnerFrame() {
  const { t } = useTranslation('outlet')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid' })
  const { data: outlet } = useSuspenseQuery(outletQuery(oid))
  const tabs = [
    { key: 'info', link: linkOptions({ to: '/admin/outlets/$oid', params: { oid } }), exact: true },
    { key: 'users', link: linkOptions({ to: '/admin/outlets/$oid/users', params: { oid } }), exact: false },
    { key: 'roles', link: linkOptions({ to: '/admin/outlets/$oid/roles', params: { oid } }), exact: false },
    { key: 'menus', link: linkOptions({ to: '/admin/outlets/$oid/menus', params: { oid } }), exact: false },
    { key: 'tables', link: linkOptions({ to: '/admin/outlets/$oid/tables', params: { oid } }), exact: false },
    { key: 'devices', link: linkOptions({ to: '/admin/outlets/$oid/devices', params: { oid } }), exact: false },
    { key: 'vouchers', link: linkOptions({ to: '/admin/outlets/$oid/vouchers', params: { oid } }), exact: false },
  ] as const

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <BackLink to="/admin/outlets">{t('detail.back')}</BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <PageHeading>{outlet.name}</PageHeading>
          <Badge variant="outline">{outlet.code}</Badge>
          <StatusBadge status={outlet.status} />
        </div>
        {/* min-w-0: the tabs scroll on a phone instead of widening the page. */}
        <nav aria-label={t('tabs.label')} className="min-w-0 border-b border-outline">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <Link
                  {...tab.link}
                  activeOptions={{ exact: tab.exact }}
                  className="inline-flex h-11 items-center border-b-2 border-transparent px-3 text-title-md whitespace-nowrap text-on-surface-variant hover:text-on-surface data-[status=active]:border-primary data-[status=active]:text-primary-strong"
                >
                  {t(`tabs.${tab.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <NestedPageHeadings>
        <Outlet />
      </NestedPageHeadings>
    </div>
  )
}
