import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { DashboardCharts, LowStock, OutletRanking, PeriodFilter, SummaryCards, TopMenus } from '@/components/dashboard/dashboard-view'
import { OutletDashboard } from '@/components/dashboard/outlet-dashboard'
import { Button } from '@/components/shared/button'
import { PageHeader } from '@/components/shared/page-header'
import { ownerDashboardQuery } from '@/hooks/dashboard/dashboard.queries'
import { allOutletsQuery } from '@/hooks/outlet/outlet.queries'
import { useSession } from '@/hooks/use-session'
import { browserTimeZone } from '@/lib/time'
import type { DashboardState } from '@/modules/dashboard/types'

const route = getRouteApi('/_auth/admin/')

/** The admin area's front door: every outlet's dashboard for the Owner, their own for anyone else. */
export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const outlet = useSession((s) => s.user?.outlet ?? null)
  const state = route.useSearch()
  const navigate = route.useNavigate()
  const onFilter = (next: Partial<DashboardState>) => void navigate({ search: (prev) => ({ ...prev, ...next }) })

  return (
    <div className="grid gap-6">
      <PageHeader title={t('title')} description={outlet ? outlet.name : t('allOutlets')} />
      {outlet ? (
        <OutletDashboard outletId={outlet.outlet_id} timeZone={outlet.timezone} state={state} onFilter={onFilter} />
      ) : (
        <OwnerDashboard state={state} onFilter={onFilter} />
      )}
    </div>
  )
}

function OwnerDashboard({ state, onFilter }: { state: DashboardState; onFilter: (next: Partial<DashboardState>) => void }) {
  const { t } = useTranslation('dashboard')
  const timeZone = browserTimeZone()
  const { data } = useSuspenseQuery(ownerDashboardQuery(state, timeZone))
  const { data: outlets } = useSuspenseQuery(allOutletsQuery())
  const picked = state.outlets ?? []
  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((o) => o !== id) : [...picked, id]
    onFilter({ outlets: next.length ? next : undefined })
  }

  return (
    <>
      <PeriodFilter state={state} timeZone={timeZone} onFilter={onFilter}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('filters.outlets')}>
          <Button
            variant={picked.length === 0 ? 'default' : 'outline'}
            className="h-11"
            aria-pressed={picked.length === 0}
            onClick={() => onFilter({ outlets: undefined })}
          >
            {t('allOutlets')}
          </Button>
          {outlets.map((o) => {
            const on = picked.includes(o.outlet_id)
            return (
              <Button key={o.outlet_id} variant={on ? 'default' : 'outline'} className="h-11" aria-pressed={on} onClick={() => toggle(o.outlet_id)}>
                {o.name}
              </Button>
            )
          })}
        </div>
      </PeriodFilter>
      <SummaryCards dashboard={data} />
      <DashboardCharts
        dashboard={data}
        second={{ title: t('charts.perOutlet'), points: data.outlets.map((o) => ({ label: o.code, sales: o.sales })) }}
      />
      <div className="grid gap-3 expanded:grid-cols-2">
        <OutletRanking dashboard={data} />
        <TopMenus dashboard={data} />
        <LowStock dashboard={data} showOutlet />
      </div>
    </>
  )
}
