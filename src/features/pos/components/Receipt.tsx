import { useTranslation } from 'react-i18next'

import { formatRupiah } from '@/shared/lib/money'
import { formatRate } from '@/shared/lib/percent'
import { formatDateTime } from '@/shared/lib/time'
import { cn } from '@/shared/lib/utils'

import type { Order } from '../api'

/** What a receipt says of its outlet. */
export type ReceiptOutlet = {
  name: string
  address: string | null
  phone: string | null
  /** The receipt's language: the outlet's, whatever the screen's is. */
  locale: string
  timezone: string
}

/**
 * A receipt: the outlet, the stand's number large for the waiter who brings
 * the order to it, the order's number, time, cashier, type and table, its
 * lines, the figures and the payment, and VOID with its reason for a voided
 * order. In the outlet's language and number style, as the spec prints
 * receipts, on screen as on 58 mm paper (styles/globals.css, @media print).
 */
export function Receipt({ order, outlet, className }: { order: Order; outlet: ReceiptOutlet; className?: string }) {
  const { i18n } = useTranslation()
  const t = i18n.getFixedT(outlet.locale, 'pos')
  const money = (amount: number) => formatRupiah(amount, outlet.locale)
  const rate = (bps: number) => formatRate(bps, outlet.locale)
  const void_ = order.status === 'void'

  return (
    <article
      lang={outlet.locale}
      aria-label={t('receipt.label', { number: order.order_no })}
      className={cn('receipt grid gap-3 text-label-md font-normal text-on-surface', className)}
    >
      <header className="grid gap-0.5 text-center">
        <p className="text-title-md">{outlet.name}</p>
        {outlet.address && <p>{outlet.address}</p>}
        {outlet.phone && <p>{outlet.phone}</p>}
      </header>
      {void_ && (
        <div className="grid gap-0.5 border-y border-dashed border-on-surface py-1 text-center">
          <p className="text-headline-md tracking-widest">{t('receipt.void')}</p>
          {order.void_reason && <p>{t('receipt.voidReason', { reason: order.void_reason })}</p>}
        </div>
      )}
      {order.stand_number && (
        <div className="grid text-center">
          <p>{t('receipt.stand')}</p>
          <p className="text-headline-lg tracking-wider break-all">{order.stand_number}</p>
        </div>
      )}
      <dl className="grid gap-0.5">
        {/* On a line of its own: 58 mm paper has no room for it beside its label. */}
        <div className="grid">
          <dt>{t('receipt.number')}</dt>
          <dd className="font-semibold break-all">{order.order_no}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t('receipt.date')}</dt>
          <dd className="text-right">{formatDateTime(order.client_created_at, outlet.locale, outlet.timezone)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t('receipt.cashier')}</dt>
          <dd className="text-right">{order.cashier.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t('receipt.type')}</dt>
          <dd className="text-right">{t(`cart.types.${order.type}`)}</dd>
        </div>
        {order.table_name && (
          <div className="flex justify-between gap-3">
            <dt>{t('receipt.table')}</dt>
            <dd className="text-right font-semibold">{order.table_name}</dd>
          </div>
        )}
      </dl>
      <ul className="grid gap-2 border-y border-dashed border-on-surface py-2">
        {order.items.map((item) => (
          <li key={item.order_item_id} className="grid gap-0.5">
            <p className="font-semibold">{item.menu_name}</p>
            <p className="flex justify-between gap-3">
              <span>{t('cart.line', { qty: item.qty, price: money(item.price) })}</span>
              <span>{money(item.line_total)}</span>
            </p>
            {item.note && <p className="italic">{item.note}</p>}
          </li>
        ))}
      </ul>
      <dl className="grid gap-0.5">
        <Row label={t('receipt.subtotal')} value={money(order.subtotal)} />
        {order.voucher_discount > 0 && (
          <Row
            label={order.voucher_code ? t('receipt.voucher', { code: order.voucher_code }) : t('receipt.discount')}
            value={`-${money(order.voucher_discount)}`}
          />
        )}
        {order.service_bps > 0 && (
          <Row label={t('receipt.service', { rate: rate(order.service_bps) })} value={money(order.service)} />
        )}
        {order.tax_bps > 0 && <Row label={t('receipt.tax', { rate: rate(order.tax_bps) })} value={money(order.tax)} />}
        <Row
          label={t('receipt.total')}
          value={money(order.total)}
          className="mt-1 border-t border-dashed border-on-surface pt-1 text-title-md"
        />
        <Row
          label={t(`cart.methods.${order.payment.method}`)}
          value={money(order.payment.received ?? order.payment.amount)}
        />
        {order.payment.change !== null && <Row label={t('receipt.change')} value={money(order.payment.change)} />}
      </dl>
      <p className="text-center">{t('receipt.thanks')}</p>
    </article>
  )
}

/** A label and its amount, on one line of the receipt. */
function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex justify-between gap-3', className)}>
      <dt>{label}</dt>
      <dd className="text-right whitespace-nowrap">{value}</dd>
    </div>
  )
}
