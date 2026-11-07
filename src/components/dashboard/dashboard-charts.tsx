import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatRupiah } from '@/lib/money'

const PRIMARY = 'var(--color-primary)'
const GRID = 'var(--color-outline)'
const MUTED = 'var(--color-on-surface-variant)'
// The composition's slices: each also has its name and amount in the list beside it.
const SLICES = ['var(--color-primary)', 'var(--color-primary-strong)', 'var(--color-on-surface-variant)']

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="grid min-w-0 gap-3 rounded-card border border-outline bg-surface p-4">
      <h2 className="text-title-md text-on-surface">{title}</h2>
      {children}
    </section>
  )
}

function useRupiah() {
  const { i18n } = useTranslation()
  return (value: number) => formatRupiah(value, i18n.language)
}

const compact = (locale: string) => (value: number) =>
  new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)

/** Sales over time: per day, a line. */
export function SalesLine({ title, points }: { title: string; points: { label: string; sales: number }[] }) {
  const { i18n } = useTranslation()
  const rupiah = useRupiah()
  return (
    <ChartCard title={title}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
            <YAxis tickFormatter={compact(i18n.language)} tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(value) => rupiah(Number(value))} />
            <Line type="monotone" dataKey="sales" stroke={PRIMARY} strokeWidth={2} dot={points.length <= 31} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** Sales side by side: per outlet, or per hour of the day. */
export function SalesBars({ title, points }: { title: string; points: { label: string; sales: number }[] }) {
  const { i18n } = useTranslation()
  const rupiah = useRupiah()
  return (
    <ChartCard title={title}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={8} />
            <YAxis tickFormatter={compact(i18n.language)} tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(value) => rupiah(Number(value))} />
            <Bar dataKey="sales" fill={PRIMARY} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** What each payment method took: a ring, with the same figures in words beside it. */
export function MethodRing({ title, empty, methods }: { title: string; empty: string; methods: { name: string; amount: number; transactions: number }[] }) {
  const rupiah = useRupiah()
  return (
    <ChartCard title={title}>
      {methods.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{empty}</p>
      ) : (
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methods} dataKey="amount" nameKey="name" innerRadius="60%" outerRadius="90%" isAnimationActive={false}>
                  {methods.map((m, i) => (
                    <Cell key={m.name} fill={SLICES[i % SLICES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => rupiah(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid gap-2">
            {methods.map((m, i) => (
              <li key={m.name} className="flex items-center justify-between gap-3 text-body-md">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: SLICES[i % SLICES.length] }} />
                  {m.name}
                </span>
                <span>{rupiah(m.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
