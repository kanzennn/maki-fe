import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { outletDashboardQuery } from '@/hooks/dashboard/dashboard.queries'
import type { DashboardState } from '@/modules/dashboard/types'

import { CashierSales, DashboardCharts, LowStock, PeriodFilter, SeatedTables, SummaryCards, TopMenus } from './dashboard-view'

/** One outlet's dashboard, its days in its time zone. */
export function OutletDashboard({
  outletId,
  timeZone,
  state,
  onFilter,
}: {
  outletId: string
  timeZone: string
  state: DashboardState
  onFilter: (next: Partial<DashboardState>) => void
}) {
  const { t } = useTranslation('dashboard')
  const { data } = useSuspenseQuery(outletDashboardQuery(outletId, state, timeZone))
  return (
    <div className="grid gap-6">
      <PeriodFilter state={state} timeZone={timeZone} onFilter={onFilter} />
      <SummaryCards dashboard={data} />
      <DashboardCharts
        dashboard={data}
        second={{
          title: t('charts.perHour'),
          points: data.hours.map((h) => ({ label: String(h.hour).padStart(2, '0'), sales: h.sales })),
        }}
      />
      <div className="grid gap-3 expanded:grid-cols-2">
        <TopMenus dashboard={data} />
        <LowStock dashboard={data} showOutlet={false} />
        <CashierSales dashboard={data} />
        <SeatedTables dashboard={data} />
      </div>
    </div>
  )
}
