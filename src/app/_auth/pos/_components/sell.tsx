import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { MonitorSmartphoneIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { PageHeading } from '@/components/shared/page-heading'
import { apiErrorMessage } from '@/lib/api-error-message'
import { formatRupiah } from '@/lib/money'
import { formatDate } from '@/lib/time'
import { Button } from '@/components/shared/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/dialog'

import type { ReceiptOutlet } from '@/components/pos/receipt'
import { catalogQuery } from '@/hooks/pos/pos.queries'
import { useBottomSlot } from '@/hooks/pos/use-bottom-slot'
import { useCart } from '@/hooks/pos/use-cart'
import { useCheckout } from '@/hooks/pos/use-checkout'
import { floorQuery } from '@/hooks/table/table.queries'
import type { CartItem, Order, Outcome, PosDevice } from '@/modules/pos/types'
import { addOne } from '@/modules/pos/usecases/add-to-cart.usecase'
import { checkVoucher } from '@/modules/pos/usecases/check-voucher.usecase'
import { orderItems } from '@/modules/pos/usecases/make-order.usecase'
import { priceCart } from '@/modules/pos/usecases/price-cart.usecase'
import { tableUnavailable } from '@/modules/pos/usecases/read-refusal.usecase'
import { reconcile } from '@/modules/pos/usecases/reconcile-cart.usecase'
import { removeLine } from '@/modules/pos/usecases/remove-line.usecase'
import { setNote } from '@/modules/pos/usecases/set-line-note.usecase'
import { setQty } from '@/modules/pos/usecases/set-line-qty.usecase'
import { standNumber } from '@/modules/pos/validations/stand.validation'

import { DetailItems } from './detail-items'
import { MenuBrowser } from './menu-browser'
import { PaymentDialog } from './payment-dialog'
import { SoldDialog } from './sold-dialog'
import { TablePicker } from './table-picker'

/**
 * The sell screen (DESIGN.md): the menus to pick from, and the order with
 * its pay button — from 840px a panel beside them, below it a bar above the
 * navigation that opens the order full height. Prices, rates and stock are
 * the catalog's, and so is how the outlet seats its dine-in customers, at a
 * table or by a stand's number; when it loads again the order follows it,
 * and says what changed.
 */
export function Sell({ outletId, device }: { outletId: string; device: PosDevice }) {
  const { t, i18n } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const { data: catalog } = useSuspenseQuery(catalogQuery(outletId))
  const lines = useCart((s) => s.lines)
  const type = useCart((s) => s.type)
  const pending = useCart((s) => s.pending)
  const voucher = useCart((s) => s.voucher)
  const table = useCart((s) => s.table)
  const stand = useCart((s) => s.standNumber)
  const setLines = useCart((s) => s.setLines)
  const setType = useCart((s) => s.setType)
  const setVoucher = useCart((s) => s.setVoucher)
  const setTable = useCart((s) => s.setTable)
  const setStandNumber = useCart((s) => s.setStandNumber)
  const checkout = useCheckout(outletId, catalog.outlet.timezone)
  const slot = useBottomSlot()
  // Whether the outlet has tables to pick from: the cashier's frame loads the floor too.
  const floor = useQuery(floorQuery(outletId))
  const hasTables = (floor.data?.areas.length ?? 0) > 0

  const [category, setCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [paying, setPaying] = useState(false)
  const [sending, setSending] = useState(false)
  const [unknown, setUnknown] = useState(false)
  const [sold, setSold] = useState<Order | null>(null)
  const [sheet, setSheet] = useState(false)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState<string[]>([])

  const menus = useMemo(() => new Map(catalog.menus.map((m) => [m.menu_id, m])), [catalog.menus])
  const locale = i18n.language

  // The order follows the catalog as it loads: a menu no longer on sale, or
  // with none left, comes out, and one with less stock than ordered is cut
  // to it. Worked out here, and kept in the cart at the cashier's next touch;
  // a sale on its way stays as it was sent.
  const reconciled = useMemo(() => reconcile(lines, menus), [lines, menus])
  const followed = pending ? lines : reconciled.lines
  // The catalog also says how the outlet seats its dine-in customers: a
  // table it picked, or a stand's number it typed, that the other way has no
  // place for is left out the same way.
  const mode = catalog.dine_in_mode
  const strayTable = !pending && mode === 'number' ? table : null
  const strayStand = !pending && mode === 'table' && stand !== '' ? standNumber(stand) : null
  const seated = strayTable ? null : table
  const typed = strayStand === null ? stand : ''
  const said = pending
    ? []
    : [
        ...(reconciled.removed.length > 0
          ? [t('changed.unavailable', { names: listNames(reconciled.removed.map((l) => l.name), locale) })]
          : []),
        ...(reconciled.reduced.length > 0
          ? [t('changed.stock', { names: listNames(reconciled.reduced.map((r) => r.line.name), locale) })]
          : []),
        ...(strayTable ? [t('stand.tableDropped', { name: strayTable.name })] : []),
        ...(strayStand ? [t('stand.standDropped', { number: strayStand })] : []),
      ]
  const shownNotice = [...new Set([...said, ...notice])]

  /** A change to the cart, made to it as it follows the catalog. */
  function change(update: (current: typeof lines) => typeof lines) {
    setLines((current) => update(reconcile(current, menus).lines))
    keepSeat()
  }

  /** Keeps in the cart what the outlet's way of seating left of its table or stand. */
  function keepSeat() {
    if (strayTable) setTable(null)
    if (strayStand !== null) setStandNumber('')
  }

  const items: CartItem[] = followed.flatMap((line) => {
    const menu = menus.get(line.menuId)
    return menu ? [{ line, menu }] : []
  })
  // The voucher's discount, worked out again from its terms as the cart
  // changes, by the rule the server checks the sale with.
  const { totals, voucherApplies } = priceCart(items, voucher, catalog.outlet)
  const inCart = new Map(followed.map((l) => [l.menuId, l.qty]))
  const count = items.reduce((sum, item) => sum + item.line.qty, 0)
  const outlet: ReceiptOutlet = {
    name: catalog.outlet.name,
    address: catalog.outlet.address,
    phone: catalog.outlet.phone,
    locale: catalog.outlet.locale,
    timezone: catalog.outlet.timezone,
  }

  /** Checks the code the customer gave; the voucher's terms then follow the cart. */
  async function applyVoucher(code: string) {
    const quote = await checkVoucher(outletId, code, totals.subtotal)
    setVoucher(quote.voucher)
  }

  /**
   * The voucher's terms again, after the total the server worked out wasn't
   * the cashier's: they may have changed since the code was checked. One the
   * sale can't take any more comes off, and the cashier is told why.
   */
  async function recheckVoucher(code: string) {
    try {
      await applyVoucher(code)
    } catch (error) {
      setVoucher(null)
      setNotice((shown) => [...shown, t('voucher.removed', { code, reason: apiErrorMessage(tCommon, error) })])
    }
  }

  /** What a refusal tells the cashier; the reload it caused says the rest. */
  function refusal(error: ApiError, code: string | null, tableName: string | null, sentStand: string | null): string[] {
    const listed = (error.details?.menus ?? []) as { menu_id?: string }[]
    if (error.code.startsWith('voucher_') && code) {
      return [t('voucher.removed', { code, reason: apiErrorMessage(tCommon, error) })]
    }
    if (error.code === 'table_unavailable' && tableName) {
      const why = tableUnavailable(error.details)
      return [
        t('tables.removed', {
          name: tableName,
          reason: why ? t(`tables.unavailable.${why}`) : apiErrorMessage(tCommon, error),
        }),
      ]
    }
    // The outlet seats its customers the way the refusal names now: what
    // the order had of the other way came off it.
    if (error.code === 'dine_in_mode_changed') {
      if (error.details?.mode === 'number') {
        return [tableName ? t('stand.tableDropped', { name: tableName }) : t('stand.nowNumber')]
      }
      if (error.details?.mode === 'table' && sentStand) return [t('stand.standDropped', { number: sentStand })]
    }
    switch (error.code) {
      case 'prices_changed':
        return [
          t('changed.prices', {
            names: listNames(
              listed.flatMap((m) => (m.menu_id ? [menus.get(m.menu_id)?.name ?? m.menu_id] : [])),
              locale,
            ),
          }),
          t('changed.check'),
        ]
      case 'total_changed':
        return [t('changed.total'), t('changed.check')]
      case 'payment_method_unavailable':
        return [t('changed.method')]
      case 'menu_unavailable':
      case 'order_stock_insufficient':
        return [t('changed.check')]
      default:
        return [apiErrorMessage(tCommon, error)]
    }
  }

  async function settle(
    run: () => Promise<Outcome>,
    code: string | null,
    tableName: string | null,
    sentStand: string | null,
  ) {
    setSending(true)
    try {
      const outcome = await run()
      if (outcome.kind === 'unknown') {
        setUnknown(true)
        setPaying(true)
        return
      }
      setUnknown(false)
      setPaying(false)
      if (outcome.kind === 'sold') {
        setNotice([])
        setSheet(false)
        setSold(outcome.order)
      } else {
        setNotice(refusal(outcome.error, code, tableName, sentStand))
        if (outcome.error.code === 'total_changed' && code) void recheckVoucher(code)
      }
    } catch (error) {
      setPaying(false)
      setNotice([apiErrorMessage(tCommon, error)])
    } finally {
      setSending(false)
    }
  }

  function pay(received: number) {
    const code = voucher?.code ?? null
    const sentStand = type === 'dine_in' && mode === 'number' ? standNumber(typed) : null
    void settle(
      () =>
        checkout.pay({
          type,
          items: orderItems(items),
          voucherCode: code,
          tableId: seated?.tableId ?? null,
          standNumber: sentStand,
          total: totals.total,
          received,
        }),
      code,
      seated?.name ?? null,
      sentStand,
    )
  }

  function resend() {
    setPaying(true)
    setUnknown(true)
    // The cart, and its table, can't change while the order is pending.
    void settle(
      () => checkout.resend(),
      pending?.voucher_code ?? null,
      pending?.table_id ? (table?.name ?? null) : null,
      pending?.stand_number ?? null,
    )
  }

  function abandon() {
    checkout.abandon()
    setUnknown(false)
    setPaying(false)
    setNotice([t('pay.abandonWarning')])
  }

  const detail = (
    <DetailItems
      catalog={catalog}
      items={items}
      totals={totals}
      type={type}
      voucher={voucher}
      voucherApplies={voucherApplies}
      table={seated}
      hasTables={hasTables}
      standNumber={typed}
      pending={pending !== null}
      onType={setType}
      onQty={(menu, qty) => change((current) => setQty(current, menu, qty))}
      onNote={(menuId, note) => change((current) => setNote(current, menuId, note))}
      onRemove={(menuId) => change((current) => removeLine(current, menuId))}
      onApplyVoucher={applyVoucher}
      onRemoveVoucher={() => setVoucher(null)}
      onPickTable={() => setPicking(true)}
      onRemoveTable={() => setTable(null)}
      onStandNumber={(value) => {
        keepSeat()
        setStandNumber(value)
      }}
      onPay={() => {
        setSheet(false)
        setPaying(true)
      }}
      onResend={() => {
        setSheet(false)
        resend()
      }}
    />
  )

  return (
    <div className="expanded:grid expanded:h-full expanded:grid-cols-[minmax(0,1fr)_22rem] expanded:grid-rows-1">
      {/* One column that can shrink: the category tiles scroll in their row instead of widening the page. */}
      <div className="grid min-w-0 grid-cols-1 content-start gap-4 p-4 pb-24 expanded:min-h-0 expanded:overflow-y-auto expanded:p-6">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <PageHeading>{t('menu.heading')}</PageHeading>
          <p className="flex items-center gap-2 text-body-md text-on-surface-variant">
            <MonitorSmartphoneIcon aria-hidden="true" className="size-4 text-icon-muted" />
            <span>{t('device.chip', { code: device.device.code, name: device.device.name })}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(new Date().toISOString(), locale, catalog.outlet.timezone)}</span>
          </p>
        </header>
        {shownNotice.length > 0 && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-control bg-warning-container p-3 text-body-md text-on-warning-container"
          >
            <ul className="grid gap-1">
              {shownNotice.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-on-warning-container hover:bg-warning-container"
              aria-label={tCommon('dialog.close')}
              onClick={() => {
                change((current) => current)
                setNotice([])
              }}
            >
              <XIcon aria-hidden="true" className="size-5" />
            </Button>
          </div>
        )}
        <MenuBrowser
          catalog={catalog}
          category={category}
          onCategory={setCategory}
          search={search}
          onSearch={setSearch}
          inCart={inCart}
          onAdd={(menu) => change((current) => addOne(current, menu))}
        />
      </div>

      <aside className="hidden min-h-0 overflow-y-auto border-l border-outline expanded:block">
        {detail}
      </aside>

      {slot &&
        (items.length > 0 || pending) &&
        createPortal(
          <div className="flex items-center justify-between gap-3 border-t border-outline bg-surface px-4 py-3">
            <p className="grid">
              <span className="text-label-sm text-on-surface-variant">{t('cart.items', { count })}</span>
              <span className="text-price-lg text-on-surface">{formatRupiah(totals.total, locale)}</span>
            </p>
            <Button className="h-12 text-title-md" onClick={() => setSheet(true)}>
              {t('cart.view')}
            </Button>
          </div>,
          slot,
        )}

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent
          aria-describedby={undefined}
          className="top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">{t('cart.title')}</DialogTitle>
          {detail}
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={paying}
        total={pending ? pending.total : totals.total}
        sending={sending}
        unknown={unknown}
        onPay={pay}
        onResend={resend}
        onAbandon={abandon}
        onClose={() => {
          setPaying(false)
          setUnknown(false)
        }}
      />
      <SoldDialog order={sold} outlet={outlet} onClose={() => setSold(null)} />
      <TablePicker
        outletId={outletId}
        open={picking}
        picked={seated?.tableId ?? null}
        onOpenChange={setPicking}
        onPick={(picked) => setTable({ tableId: picked.table_id, name: picked.name })}
      />
    </div>
  )
}

/** Menus' names as the language lists them: "Kopi, Teh, dan Roti". */
function listNames(names: string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(names)
}
