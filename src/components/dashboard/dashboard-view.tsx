import { Link } from '@tanstack/react-router'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shared/badge'
import { Button } from '@/components/shared/button'
import { FormField } from '@/components/shared/form-field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'
import { formatRupiah } from '@/lib/money'
import { presetPeriod, statePeriod } from '@/modules/dashboard/filters'
import { dashboardPresets, type Dashboard, type DashboardState } from '@/modules/dashboard/types'
import { growth } from '@/modules/dashboard/usecases/growth.usecase'

const SalesLine = lazy(() => import('./dashboard-charts').then((m) => ({ default: m.SalesLine })))
const SalesBars = lazy(() => import('./dashboard-charts').then((m) => ({ default: m.SalesBars })))
const MethodRing = lazy(() => import('./dashboard-charts').then((m) => ({ default: m.MethodRing })))

/** The period's presets and dates. Each is a filter of the page's address. */
export function PeriodFilter({
  state,
  timeZone,
  onFilter,
  children,
}: {
  state: DashboardState
  timeZone: string
  onFilter: (next: Partial<DashboardState>) => void
  children?: ReactNode
}) {
  const { t } = useTranslation('dashboard')
  const period = statePeriod(state, timeZone)
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('filters.period')}>
        {dashboardPresets.map((preset) => {
          const dates = presetPeriod(preset, timeZone)
          const on = dates.from === period.from && dates.to === period.to
          return (
            <Button key={preset} variant={on ? 'default' : 'outline'} className="h-11" aria-pressed={on} onClick={() => onFilter(dates)}>
              {t(`filters.${preset}`)}
            </Button>
          )
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 expanded:max-w-xl">
        <FormField label={t('filters.from')} type="date" value={period.from} max={period.to} onChange={(e) => e.target.value && onFilter({ from: e.target.value })} />
        <FormField label={t('filters.to')} type="date" value={period.to} min={period.from} onChange={(e) => e.target.value && onFilter({ to: e.target.value })} />
      </div>
      {children}
    </div>
  )
}

function Card({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="grid content-start gap-1 rounded-card border border-outline bg-surface p-4">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-headline-md break-words text-on-surface">{value}</p>
      {note}
    </div>
  )
}

/** Up or down from the period before, in words as well as an arrow. */
export function Growth({ now, before }: { now: number; before: number }) {
  const { t, i18n } = useTranslation('dashboard')
  const change = growth(now, before)
  if (change === null) return <span className="text-label-md text-on-surface-variant">{t('growth.none')}</span>
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 }).format(Math.abs(change))
  const up = change >= 0
  const Icon = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <span className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
      <Icon aria-hidden="true" className="size-3.5" />
      {t(up ? 'growth.up' : 'growth.down', { percent })}
    </span>
  )
}

/** The cards every dashboard starts with. */
export function SummaryCards({ dashboard }: { dashboard: Dashboard }) {
  const { t, i18n } = useTranslation('dashboard')
  const rupiah = (n: number) => formatRupiah(n, i18n.language)
  const number = (n: number) => new Intl.NumberFormat(i18n.language).format(n)
  const s = dashboard.summary
  return (
    <div className="grid gap-3 sm:grid-cols-2 expanded:grid-cols-5">
      <Card label={t('cards.sales')} value={rupiah(s.sales)} note={<Growth now={s.sales} before={s.previous_sales} />} />
      <Card label={t('cards.transactions')} value={number(s.transactions)} note={<Growth now={s.transactions} before={s.previous_transactions} />} />
      <Card label={t('cards.average')} value={rupiah(s.average_transaction)} />
      <Card label={t('cards.items')} value={number(s.items_sold)} />
      <Card
        label={t('cards.voids')}
        value={number(s.void_count)}
        note={<span className="text-label-md text-on-surface-variant">{rupiah(s.void_total)}</span>}
      />
    </div>
  )
}

/** The charts every dashboard has, the second chart its own: by outlet, or by hour. */
export function DashboardCharts({ dashboard, second }: { dashboard: Dashboard; second: { title: string; points: { label: string; sales: number }[] } }) {
  const { t, i18n } = useTranslation('dashboard')
  const payment = useTranslation('payment')
  const day = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return (
    <Suspense fallback={<div className="h-64" />}>
      <div className="grid gap-3 expanded:grid-cols-2">
        <SalesLine
          title={t('charts.perDay')}
          points={dashboard.days.map((d) => ({ label: day.format(new Date(`${d.date}T00:00:00Z`)), sales: d.sales }))}
        />
        <SalesBars title={second.title} points={second.points} />
        <MethodRing
          title={t('charts.methods')}
          empty={t('empty')}
          methods={dashboard.payment_methods.map((m) => ({
            name: payment.t(`methods.${m.method}` as never, { defaultValue: m.method }),
            amount: m.amount,
            transactions: m.transactions,
          }))}
        />
      </div>
    </Suspense>
  )
}

function TableCard({ title, empty, isEmpty, children }: { title: string; empty: string; isEmpty: boolean; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid min-w-0 content-start gap-3 rounded-card border border-outline bg-surface p-4">
      <h2 className="text-title-md text-on-surface">{title}</h2>
      {isEmpty ? <p className="text-body-md text-on-surface-variant">{empty}</p> : <div className="overflow-x-auto">{children}</div>}
    </section>
  )
}

/** The menus that sold the most. */
export function TopMenus({ dashboard }: { dashboard: Dashboard }) {
  const { t, i18n } = useTranslation('dashboard')
  return (
    <TableCard title={t('tables.topMenus')} empty={t('empty')} isEmpty={dashboard.top_menus.length === 0}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.menu')}</TableHead>
            <TableHead className="text-right">{t('columns.qty')}</TableHead>
            <TableHead className="text-right">{t('columns.sales')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dashboard.top_menus.map((m) => (
            <TableRow key={`${m.outlet_id}-${m.menu_id}`}>
              <TableCell>{m.name}</TableCell>
              <TableCell className="text-right">{m.qty}</TableCell>
              <TableCell className="text-right">{formatRupiah(m.sales, i18n.language)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/** The menus at or below their alert, or out of stock. */
export function LowStock({ dashboard, showOutlet }: { dashboard: Dashboard; showOutlet: boolean }) {
  const { t } = useTranslation('dashboard')
  return (
    <TableCard title={t('tables.lowStock')} empty={t('stockFine')} isEmpty={dashboard.low_stock.length === 0}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.menu')}</TableHead>
            {showOutlet && <TableHead>{t('columns.outlet')}</TableHead>}
            <TableHead className="text-right">{t('columns.stock')}</TableHead>
            <TableHead>{t('columns.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dashboard.low_stock.map((m) => (
            <TableRow key={m.menu_id}>
              <TableCell>{m.name}</TableCell>
              {showOutlet && <TableCell>{m.outlet_name}</TableCell>}
              <TableCell className="text-right">{m.stock_qty}</TableCell>
              <TableCell>
                <Badge variant={m.stock_status === 'out' ? 'secondary' : 'outline'}>{t(`stock.${m.stock_status}`)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/** The Owner's outlets, the best first, each leading to its pages. */
export function OutletRanking({ dashboard }: { dashboard: Dashboard }) {
  const { t, i18n } = useTranslation('dashboard')
  return (
    <TableCard title={t('tables.outlets')} empty={t('empty')} isEmpty={dashboard.outlets.length === 0}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.outlet')}</TableHead>
            <TableHead className="text-right">{t('columns.sales')}</TableHead>
            <TableHead className="text-right">{t('columns.transactions')}</TableHead>
            <TableHead>{t('columns.growth')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dashboard.outlets.map((o) => (
            <TableRow key={o.outlet_id}>
              <TableCell>
                <Link to="/admin/outlets/$oid/dashboard" params={{ oid: o.outlet_id }} className="text-primary-strong hover:underline">
                  {o.name}
                </Link>
              </TableCell>
              <TableCell className="text-right">{formatRupiah(o.sales, i18n.language)}</TableCell>
              <TableCell className="text-right">{o.transactions}</TableCell>
              <TableCell>
                <Growth now={o.sales} before={o.previous_sales} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/** What each of the outlet's cashiers sold. */
export function CashierSales({ dashboard }: { dashboard: Dashboard }) {
  const { t, i18n } = useTranslation('dashboard')
  return (
    <TableCard title={t('tables.cashiers')} empty={t('empty')} isEmpty={dashboard.cashiers.length === 0}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.cashier')}</TableHead>
            <TableHead className="text-right">{t('columns.transactions')}</TableHead>
            <TableHead className="text-right">{t('columns.sales')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dashboard.cashiers.map((c) => (
            <TableRow key={c.user_id}>
              <TableCell>{c.name}</TableCell>
              <TableCell className="text-right">{c.transactions}</TableCell>
              <TableCell className="text-right">{formatRupiah(c.sales, i18n.language)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

/** The tables customers are seated at now; an outlet without any says so. */
export function SeatedTables({ dashboard }: { dashboard: Dashboard }) {
  const { t } = useTranslation('dashboard')
  return (
    <TableCard title={t('tables.seated')} empty={t('noneSeated')} isEmpty={dashboard.tables.length === 0}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.table')}</TableHead>
            <TableHead>{t('columns.area')}</TableHead>
            <TableHead className="text-right">{t('columns.orders')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dashboard.tables.map((table) => (
            <TableRow key={table.table_id}>
              <TableCell>{table.name}</TableCell>
              <TableCell>{table.area_name}</TableCell>
              <TableCell className="text-right">{table.orders}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}
