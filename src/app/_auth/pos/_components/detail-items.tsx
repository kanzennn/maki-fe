import {
  ArmchairIcon,
  BanknoteIcon,
  CreditCardIcon,
  HashIcon,
  MinusIcon,
  PlusIcon,
  QrCodeIcon,
  Trash2Icon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CategoryIcon } from '@/components/menu/category-icon'
import { FormAlert } from '@/components/shared/form-message'
import { formatRupiah } from '@/lib/money'
import { formatNumber } from '@/lib/number'
import { formatRate } from '@/lib/percent'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shared/button'

import {
  MAX_NOTE,
  MAX_STAND,
  MAX_SUBTOTAL,
  type CartItem,
  type CartTable,
  type OrderType,
  type PaymentMethod,
  type PosCatalog,
  type PosMenu,
  type PosVoucher,
  type Totals,
} from '@/modules/pos/types'
import { maxQty } from '@/modules/pos/validations/cart.validation'
import { validStand } from '@/modules/pos/validations/stand.validation'

import { VoucherField } from './voucher-field'

/**
 * DESIGN.md's Detail Items panel: the order type and, for dine-in, its
 * table if the outlet has tables, or the number on the customer's stand
 * where the outlet seats its customers by number stands; the lines with
 * their steppers and notes, the voucher, the summary, the payment methods
 * and the pay button. While a sale's answer hasn't come, the order can't
 * change: the panel offers to send it again instead.
 */
export function DetailItems({
  catalog,
  items,
  totals,
  type,
  voucher,
  voucherApplies,
  table,
  hasTables,
  standNumber,
  pending,
  onType,
  onQty,
  onNote,
  onRemove,
  onApplyVoucher,
  onRemoveVoucher,
  onPickTable,
  onRemoveTable,
  onStandNumber,
  onPay,
  onResend,
}: {
  catalog: PosCatalog
  items: CartItem[]
  totals: Totals
  type: OrderType
  voucher: PosVoucher | null
  /** False while the subtotal is short of the voucher's minimum spend: no paying yet. */
  voucherApplies: boolean
  table: CartTable | null
  /** Whether the outlet has tables to pick from. */
  hasTables: boolean
  /** The stand's number as the cashier typed it; empty for none. */
  standNumber: string
  /** An order sent without an answer yet: the cart is locked until it is settled. */
  pending: boolean
  onType: (type: OrderType) => void
  onQty: (menu: PosMenu, qty: number) => void
  onNote: (menuId: string, note: string) => void
  onRemove: (menuId: string) => void
  onApplyVoucher: (code: string) => Promise<unknown>
  onRemoveVoucher: () => void
  onPickTable: () => void
  onRemoveTable: () => void
  onStandNumber: (standNumber: string) => void
  onPay: () => void
  onResend: () => void
}) {
  const { t, i18n } = useTranslation('pos')
  const titleId = useId()
  const money = (amount: number) => formatRupiah(amount, i18n.language)
  const count = items.reduce((sum, item) => sum + item.line.qty, 0)
  const categories = new Map(catalog.categories.map((c) => [c.category_id, c]))
  const tooMuch = totals.subtotal > MAX_SUBTOTAL
  const cash = catalog.payment_methods.includes('cash')
  const { outlet } = catalog
  // One way to seat a dine-in order, the outlet's: a table, always optional,
  // or a stand's number, needed before paying. What an order on its way
  // carries shows either way.
  const byStand = catalog.dine_in_mode === 'number'
  const dineIn = type === 'dine_in'
  const standMissing = dineIn && byStand && !validStand(standNumber)

  return (
    <section aria-labelledby={titleId} className="flex h-full min-h-0 flex-col bg-surface">
      <header className="grid gap-3 border-b border-outline p-4">
        {/* In the phone's sheet, clear of its close button. */}
        <div className="flex items-baseline justify-between gap-3 pr-10 expanded:pr-0">
          <h2 id={titleId} className="text-headline-md text-on-surface">
            {t('cart.title')}
          </h2>
          <span className="text-label-sm text-on-surface-variant">{t('cart.items', { count })}</span>
        </div>
        <OrderTypeToggle value={type} onChange={onType} disabled={pending} />
        {dineIn && (table || (!byStand && hasTables)) && (
          <TableChoice table={table} locked={pending} onPick={onPickTable} onRemove={onRemoveTable} />
        )}
        {dineIn && (byStand || standNumber !== '') && (
          <StandField value={standNumber} locked={pending} onChange={onStandNumber} />
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <p className="py-6 text-body-md text-on-surface-variant">{t('cart.empty')}</p>
        ) : (
          <ul className="divide-y divide-outline">
            {items.map((item) => (
              <CartLineRow
                key={item.line.menuId}
                item={item}
                icon={categories.get(item.menu.category_id)?.icon ?? null}
                category={categories.get(item.menu.category_id)?.name ?? ''}
                locked={pending}
                onQty={(qty) => onQty(item.menu, qty)}
                onNote={(note) => onNote(item.line.menuId, note)}
                onRemove={() => onRemove(item.line.menuId)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="grid gap-4 border-t border-outline p-4">
        <VoucherField
          voucher={voucher}
          applies={voucherApplies}
          locked={pending}
          onApply={onApplyVoucher}
          onRemove={onRemoveVoucher}
        />
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-body-md">
          <dt className="text-on-surface-variant">{t('cart.summary.items')}</dt>
          <dd className="text-right text-on-surface">{formatNumber(count, i18n.language)}</dd>
          <dt className="text-on-surface-variant">{t('cart.summary.subtotal')}</dt>
          <dd className="text-right text-on-surface">{money(totals.subtotal)}</dd>
          {totals.discount > 0 && (
            <>
              <dt className="text-on-surface-variant">
                {voucher ? t('cart.summary.voucher', { code: voucher.code }) : t('cart.summary.discount')}
              </dt>
              <dd className="text-right text-primary-strong">-{money(totals.discount)}</dd>
            </>
          )}
          {outlet.service_bps > 0 && (
            <>
              <dt className="text-on-surface-variant">
                {t('cart.summary.service', { rate: formatRate(outlet.service_bps, i18n.language) })}
              </dt>
              <dd className="text-right text-on-surface">{money(totals.service)}</dd>
            </>
          )}
          {outlet.tax_bps > 0 && (
            <>
              <dt className="text-on-surface-variant">
                {t('cart.summary.tax', { rate: formatRate(outlet.tax_bps, i18n.language) })}
              </dt>
              <dd className="text-right text-on-surface">{money(totals.tax)}</dd>
            </>
          )}
          <dt className="mt-1 border-t border-dashed border-outline pt-3 text-headline-md text-on-surface">
            {t('cart.summary.total')}
          </dt>
          <dd className="mt-1 border-t border-dashed border-outline pt-3 text-right text-headline-md text-on-surface">
            {money(totals.total)}
          </dd>
        </dl>
        <PaymentMethods available={catalog.payment_methods} />
        {tooMuch && <FormAlert>{t('cart.tooMuch')}</FormAlert>}
        {pending ? (
          <div className="grid gap-3">
            <FormAlert>{t('cart.locked')}</FormAlert>
            <Button className="h-12 text-title-md" onClick={onResend}>
              {t('pay.resend')}
            </Button>
          </div>
        ) : (
          <Button
            className="h-12 text-title-md"
            disabled={
              items.length === 0 || tooMuch || !cash || (voucher !== null && !voucherApplies) || standMissing
            }
            onClick={onPay}
          >
            {t('cart.pay', { total: money(totals.total) })}
          </Button>
        )}
      </footer>
    </section>
  )
}

/** Dine-in or takeaway, as two tiles: radio buttons underneath. */
function OrderTypeToggle({
  value,
  onChange,
  disabled,
}: {
  value: OrderType
  onChange: (type: OrderType) => void
  disabled: boolean
}) {
  const { t } = useTranslation('pos')
  const name = useId()
  return (
    <fieldset disabled={disabled} className="grid gap-2">
      <legend className="sr-only">{t('cart.type')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(['dine_in', 'takeaway'] as const).map((type) => (
          <label
            key={type}
            className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-tile border border-outline bg-surface px-3 text-title-md text-on-surface has-[:checked]:border-primary has-[:checked]:bg-primary-container has-[:checked]:text-primary-strong has-[:disabled]:cursor-not-allowed has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
          >
            <input
              type="radio"
              name={name}
              value={type}
              checked={value === type}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            {t(`cart.types.${type}`)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** The dine-in order's table: a button to pick one, always optional, or the one picked with ways to change it or let it go. */
function TableChoice({
  table,
  locked,
  onPick,
  onRemove,
}: {
  table: CartTable | null
  locked: boolean
  onPick: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation('pos')
  if (!table) {
    return (
      <Button variant="outline" className="h-11 justify-start" disabled={locked} onClick={onPick}>
        <ArmchairIcon aria-hidden="true" />
        {t('tables.pick.choose')}
        <span className="ml-auto text-label-sm text-on-surface-variant">{t('tables.pick.optional')}</span>
      </Button>
    )
  }
  return (
    <div className="flex min-h-11 items-center gap-1 rounded-tile border border-primary bg-primary-container pl-3 text-on-primary-container">
      <ArmchairIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-title-md">{t('tables.pick.chosen', { name: table.name })}</span>
      <Button variant="ghost" className="h-11 text-on-primary-container" disabled={locked} onClick={onPick}>
        {t('tables.pick.change')}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-on-primary-container"
        aria-label={t('tables.pick.remove', { name: table.name })}
        disabled={locked}
        onClick={onRemove}
      >
        <XIcon aria-hidden="true" className="size-5" />
      </Button>
    </div>
  )
}

/**
 * The number on the dine-in customer's stand, typed as the stand shows it
 * and needed before paying. One row, as the table's choice is, so the
 * order's lines keep their room: the label at its start, the number at its
 * end. What it takes is said once the cashier leaves the field with a
 * number the server wouldn't keep.
 */
function StandField({
  value,
  locked,
  onChange,
}: {
  value: string
  locked: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('pos')
  const id = useId()
  const [left, setLeft] = useState(false)
  const wrong = left && value.trim() !== '' && !validStand(value)
  return (
    <div className="grid gap-1">
      <label
        className={cn(
          'flex h-11 cursor-text items-center gap-2 rounded-md border bg-surface px-3 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
          wrong ? 'border-destructive' : 'border-input',
        )}
      >
        <HashIcon aria-hidden="true" className="size-4 shrink-0 text-icon-muted" />
        <span className="text-title-md whitespace-nowrap text-on-surface">{t('stand.label')}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setLeft(true)}
          placeholder={t('stand.placeholder')}
          required
          maxLength={MAX_STAND}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          disabled={locked}
          aria-invalid={wrong ? true : undefined}
          aria-describedby={wrong ? `${id}-error` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-right text-title-md text-on-surface uppercase outline-none placeholder:font-normal placeholder:normal-case placeholder:text-text-placeholder disabled:cursor-not-allowed"
        />
      </label>
      {wrong && (
        <p id={`${id}-error`} className="text-label-md text-error">
          {t('stand.format')}
        </p>
      )}
    </div>
  )
}

/**
 * A line: its menu, category, price × qty, the stepper (DESIGN.md: an
 * outlined minus, a filled plus, each a 44px target however small it looks),
 * the note and the button that takes it out. The plus stops at the stock.
 */
function CartLineRow({
  item,
  icon,
  category,
  locked,
  onQty,
  onNote,
  onRemove,
}: {
  item: CartItem
  icon: string | null
  category: string
  locked: boolean
  onQty: (qty: number) => void
  onNote: (note: string) => void
  onRemove: () => void
}) {
  const { t, i18n } = useTranslation('pos')
  const noteId = useId()
  const { line, menu } = item
  const [noting, setNoting] = useState(line.note !== '')
  const most = maxQty(menu)
  const money = (amount: number) => formatRupiah(amount, i18n.language)

  return (
    <li className="grid gap-2 py-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-card bg-surface-container text-headline-md"
        >
          {icon ?? <CategoryIcon icon={null} />}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="truncate text-title-md text-on-surface">{menu.name}</p>
          <p className="truncate text-label-sm text-on-surface-variant">{category}</p>
        </div>
        <p className="text-right text-label-md whitespace-nowrap text-primary-strong">
          {t('cart.line', { qty: formatNumber(line.qty, i18n.language), price: money(menu.price) })}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center">
          <StepButton
            icon={MinusIcon}
            label={t('cart.less', { name: menu.name })}
            disabled={locked}
            onClick={() => onQty(line.qty - 1)}
          />
          <span className="min-w-8 text-center text-title-md text-on-surface" aria-live="polite">
            {formatNumber(line.qty, i18n.language)}
          </span>
          <StepButton
            icon={PlusIcon}
            filled
            label={t('cart.more', { name: menu.name })}
            disabled={locked || line.qty >= most}
            onClick={() => onQty(line.qty + 1)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="h-11 text-label-md text-on-surface-variant"
            aria-expanded={noting}
            aria-controls={noteId}
            disabled={locked}
            onClick={() => setNoting((open) => !open)}
          >
            {t('cart.note')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-icon-muted"
            aria-label={t('cart.remove', { name: menu.name })}
            disabled={locked}
            onClick={onRemove}
          >
            <Trash2Icon aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>
      {menu.track_stock && line.qty >= most && (
        <p className="text-label-sm text-on-surface-variant">
          {t('cart.stockLeft', { count: formatNumber(most, i18n.language) })}
        </p>
      )}
      <div id={noteId} hidden={!noting}>
        <input
          aria-label={t('cart.noteFor', { name: menu.name })}
          value={line.note}
          maxLength={MAX_NOTE}
          placeholder={t('cart.notePlaceholder')}
          disabled={locked}
          onChange={(e) => onNote(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-surface px-3 text-body-md text-on-surface outline-none placeholder:text-text-placeholder focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
    </li>
  )
}

function StepButton({
  icon: Icon,
  label,
  filled = false,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  filled?: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="group grid size-11 place-items-center rounded-control outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed"
    >
      <span
        className={cn(
          'grid size-7 place-items-center rounded-control group-disabled:opacity-40',
          filled ? 'bg-primary text-on-primary' : 'border border-outline bg-surface text-primary',
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
    </button>
  )
}

const methodIcons: Record<PaymentMethod, LucideIcon> = { cash: BanknoteIcon, qris: QrCodeIcon, debit: CreditCardIcon }

/**
 * DESIGN.md's payment tiles. Cash is the one this cashier takes; QRIS and
 * debit arrive with their own milestone, and say so.
 */
function PaymentMethods({ available }: { available: PaymentMethod[] }) {
  const { t } = useTranslation('pos')
  const name = useId()
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-title-md text-on-surface">{t('cart.method')}</legend>
      <div className="grid grid-cols-3 gap-2">
        {(['cash', 'qris', 'debit'] as const).map((method) => {
          const Icon = methodIcons[method]
          const offered = method === 'cash' && available.includes(method)
          return (
            <label
              key={method}
              className={cn(
                'grid min-h-16 justify-items-center gap-1 rounded-tile border border-outline bg-surface px-2 py-2 text-center text-label-md text-on-surface has-[:checked]:border-primary has-[:checked]:bg-primary-container has-[:checked]:text-primary-strong',
                !offered && 'cursor-not-allowed bg-surface-variant text-on-surface-variant',
              )}
            >
              <input
                type="radio"
                name={name}
                value={method}
                checked={offered}
                disabled={!offered}
                readOnly
                className="sr-only"
              />
              <Icon aria-hidden="true" className="size-5" />
              {t(`cart.methods.${method}`)}
              {!offered && <span className="text-label-sm">{t('cart.soon')}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}