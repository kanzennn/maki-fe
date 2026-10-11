# Design system

The design source is [`Maki/DESIGN.md`](../../DESIGN.md). Its tokens live in
`src/styles/globals.css` as Tailwind v4 `@theme` variables, so every token is
a utility class. Tailwind's default palette is switched off: only the
tokens (plus `white` and `black`) exist.

## Tokens → utilities

| DESIGN.md | Utility examples |
| --- | --- |
| Colours (`primary`, `on-surface-variant`, `warning-container`, `error`, …) | `bg-primary`, `text-on-surface-variant`, `bg-warning-container`, `text-error` |
| Typography (`headline-lg` … `label-sm`) | `text-headline-lg`, `text-body-md`, `text-label-sm` (size, line height and weight together) |
| Radii (sm 4, DEFAULT 8, md 10, lg 12) | `rounded-control`, `rounded-card`, `rounded-tile`, `rounded-field` |
| Shadow `card-subtle` | `shadow-card-subtle` |
| Font | `font-sans` — Plus Jakarta Sans, bundled with Fontsource |

Never write raw values (`bg-[#ff5c33]`, `text-[13px]`): a token change has to
reach every screen without a find-and-replace.

**Two oranges.** `primary` (#FF5C33, the brand orange) is only for borders,
tints, the focus ring and icon-only fills — as text it fails WCAG AA.
Anything orange that is text, an icon on a tint, or a button with a text
label uses `primary-strong` (#BC3F0B): `text-primary-strong`,
`bg-primary-strong`. shadcn's default button variant was edited to use it.

**Form fields** are bordered in `icon-muted` #8A8A8A (shadcn's `input`
colour), 3.5:1 on white: a field's edge needs 3:1 (WCAG 1.4.11), and card
borders' `outline` #EBEBEB is 1.2:1. This is DESIGN.md's `text-field`.

**One light theme.** shadcn/ui components ship `dark:` variants; `globals.css`
ties them to a `.dark` class that is never set, so a dark-mode OS doesn't
grey out inputs.

`cn()` in `shared/lib/utils.ts` knows the custom text sizes and radii.
Without that, tailwind-merge would read `text-body-md` as a colour and drop
it next to `text-on-surface`.

## shadcn/ui

Components are added with `npx shadcn@latest add <name>` into
`src/shared/ui/` and then owned by the project. The names shadcn uses are
mapped onto the tokens once, in `globals.css`:

| shadcn | Token |
| --- | --- |
| `background`, `card`, `popover` | `surface` / `background` (white) |
| `foreground` and the `*-foreground` pairs | `on-surface`, `on-primary`, `on-error` |
| `primary` | `primary` |
| `secondary`, `muted` | `surface-container` (neutral — DESIGN.md's blue `secondary` isn't used in Maki) |
| `muted-foreground` | `on-surface-variant` |
| `accent` | `primary-container` |
| `destructive` | `error` |
| `border` | `outline` |
| `input` | `icon-muted`: form fields, checkboxes and selects need 3:1 |
| `ring` | `primary` |

The shadcn radius scale sits on the same sizes: `rounded-sm` 4px,
`rounded-md` 8px, `rounded-lg` 10px, `rounded-xl` 12px.

The CLI writes `import { cn } from "cn"` into generated components instead
of the `utils` alias, and adds the stray `cn` npm package to
`package.json`. It has done so on every run so far. After adding a
component:

- fix the import;
- `npm uninstall cn`;
- answer **no** when it offers to overwrite `button.tsx`, which is edited
  here (`printf 'n\n' | npx shadcn@latest add …`).

The components added so far, and what was changed in them:

| Component | Changed |
| --- | --- |
| `button`, `input`, `label` | `default` button in `primary-strong` |
| `dialog`, `alert-dialog` | No drop shadow (a 1px `outline` border, over a black/50 overlay), titles `headline-md`, text `body-md`, left-aligned at every width. The close button's label comes from `common:dialog.close` and its target is 44px |
| `checkbox` | 20px, bordered in `input` (`icon-muted`); checked, it is an icon-only fill in `primary` |
| `badge` | Every variant pairs a tint with text that passes AA (shadcn's default put white on `primary`): `default` `primary-container`, `secondary` `surface-container`, `outline`, `destructive` `error-container`, and `warning`, DESIGN.md's low-stock badge (`warning-container` with `on-warning-container`), for nothing else |
| `table` | `body-md` cells, `label-md` headings in `on-surface-variant`, 44px heading row |
| `native-select` | A text-field: 44px, `input` border, `className` sizes the wrapper so it can fill a form or sit in a filter bar |
| `textarea` | Nothing; `TextareaField` (`features/menu`) sizes it to `body-md` like the other fields |

The tailwind-animate classes shadcn writes are dropped: nothing animates,
which also suits `prefers-reduced-motion`. Any component that turns off the
outline (`outline-none`) draws the `ring` on `focus-visible` instead, so
focus always shows.

## Icons

[lucide-react](https://lucide.dev), shadcn's icon set: thin outline icons,
as DESIGN.md asks, in `icon-muted` unless they are active or on a tint
(`primary-strong`). An icon next to text is `aria-hidden`; an icon-only
button has an `aria-label`.

## Admin navigation

DESIGN.md's sidebar-nav, in `app/AdminLayout.tsx`, with its items drawn
by `app/NavLink.tsx`, which the cashier's frame uses too:

- **Where:** from 840px wide (the `expanded:` variant, `--breakpoint-expanded:
  52.5rem` in `globals.css`), a 96px sidebar with a 1px `outline` border
  down the whole column. Its items stay in view while the page scrolls.
  Below 840px, the same items in a bottom navigation bar.
- **Labels:** each item is its icon over a `label-md` label. DESIGN.md's
  sidebar is icons only, but the admin area's sections have no icons people
  recognise on sight (Outlet, Role, User), so the label stays.
- **Active item:**
  - the icon on a `primary-container-strong` pill;
  - icon and label in `primary-strong`;
  - in the sidebar, a short `primary` bar under it.
- **Header:** the header above keeps the app name (a link to the user's
  start page), the user's outlet, their name and sign-out.
- **Tabs:** an outlet's tabs (Info, User, Role, Menu, Meja, Perangkat,
  Voucher) mark the active one with a 2px `primary` underline and
  `primary-strong` text. On a phone they scroll in their row rather than
  widen the page.
- **A phone's bottom bar** gives each item an equal share. Up to seven
  items, each label fits; a Manager with every permission has eight, and
  then *Perangkat* is cut short with an ellipsis. The link's name stays
  whole for a screen reader, and the icon still tells it apart.

## Cashier screens

DESIGN.md's point-of-sale screen, in `app/PosLayout.tsx` and
`features/pos`:

- **From 840px wide:** the icon sidebar (Kasir, Meja when the outlet has
  tables, Riwayat, Admin), the menu
  column, and the Detail Items panel, 22rem, split off by a 1px `outline`
  border. The frame fills the screen under the header
  (`--app-header` in `globals.css`), and each column scrolls on its own:
  the panel's lines scroll while its summary, payment tiles and pay button
  stay in view.
- **Below 840px:** the bottom navigation, the menu grid in 2 columns below
  640px and 3 above, and, once the order has a line, the cart bar just
  above the navigation: the item count and total, and a `button-primary`
  *Lihat pesanan* that opens Detail Items at full height, with the pay
  button at its foot. The bar and the navigation share one fixed footer,
  so the bar sits on the navigation whatever its height.
- **The header row** of the menu column: the page heading, the device
  (*K01 · Kasir depan*) and the outlet's date; below it the search-input,
  as DESIGN.md draws it (an `outline` border, `rounded-field`, the
  magnifier on the right).
- **Category tiles:** emoji, name and *N item*, in one row that scrolls on
  its own; the chosen one `category-tile-active`. Below 840px the compact
  tile drops the count. *Semua menu* comes first.
- **Menu cards:** the photo (the category's emoji on `surface-container`
  until menus have photos), the name, the stock in words (*Tersedia 12*,
  *Selalu tersedia*), the price in `price-lg`. Low stock gets the
  `warning` badge at the photo's top left and its count in
  `on-warning-container`; sold out is the card on `surface-variant`, the
  photo in grayscale, *Habis*, and can't be picked. A menu in the order
  shows *N di pesanan* at the photo's bottom right. The badges come after
  the name in the page, so a card is called by its name.
- **Detail Items:** the order type as two tiles (Dine-in, Takeaway); each
  line with its thumbnail, name, category, *2 × Rp 18.000* in
  `primary-strong`, the stepper (an outlined minus and a `primary` plus,
  28px to look at and 44px to tap), *Catatan*, which opens the line's note
  field, and the trash icon. Then the voucher: a *Voucher* field with
  *Pakai* beside it, and a refused code's reason under it in `error`; once
  taken, a `primary-container` chip with a `primary` border, the code, its
  name when it has one, and the button that takes it off, and short of its
  minimum spend a `warning-container` line saying how much it needs, while
  Pay is off. Then the summary rows, the discount as *Potongan (KODE)* in
  `primary-strong` with a minus, a dashed divider, the total in
  `headline-md`, the payment tiles (Tunai chosen; QRIS and Debit greyed,
  *Segera hadir*) and the pay button.
- **The table** of a dine-in order sits under the order type: *Pilih meja*
  as an outline button with *Opsional* at its end, or, once picked, a
  `primary-container` chip with a `primary` border, *Meja A1*, *Ganti* and
  the button that lets it go. Picking is a dialog with the floor.
- **The stand's number** sits there instead where the outlet seats its
  customers by number stands: one bordered row, as the table's choice is,
  with `#` in `icon-muted`, *Nomor papan*, and the number typed at its end
  in capitals (*Wajib, misalnya 12* until then). A number the server
  wouldn't take is said under it in `error`, once the cashier leaves the
  field. One row, so the order's lines keep their room at 800px high.
- **Paying in cash** is a dialog: the total, the cash received with `Rp` in
  front, the quick amounts the spec names (*Uang pas*, 50.000, 100.000, off
  when they don't cover the total), and the change, or what is short in
  the error colours. While a sale's answer is missing the dialog says so,
  with *Kirim ulang*.
- **What changed** since the catalog loaded (a price, the stock, the rates)
  is said in a `warning-container` box above the menus, until dismissed.
- **The receipt** is a paper-white card on screen and the receipt alone in
  print: 48mm of a 58mm roll, the outlet, a stand's number in
  `headline-lg` under it for the waiter, the number on a line of its own,
  the time, cashier, type and table, the lines, then the figures (the discount as
  *Potongan (KODE)*) with a dashed rule before the total, and *VOID* with
  the reason across it when voided.
- **Today's orders:** a table of time, receipt number, table or stand
  (*No. 12*; *Tanpa meja* in `on-surface-variant` for none), items, total, cashier and status (*Lunas* `secondary`, *Void* `destructive`). On a
  phone the number stays on one line, with the time, item count and status
  under it, beside the total.

## Admin screens

- **Lists** are a `table` in a card-bordered box. On a phone they drop the
  columns that matter least: an outlet's Managers, a user's last sign-in.
  They keep the name, with its code or username under it, and the status.
  A menu's price and stock matter too much to drop, so on a phone they move
  under its name instead. The box is `min-w-0`, so a table wider than the
  screen scrolls inside it rather than widening the page.
- **Filter bars:** a search field and selects, each with a visible label.
  The search field is a text-field (`input` border, `rounded-md`) with
  search-input's magnifier on the right, so it matches the selects beside
  it. DESIGN.md's search-input — `outline` border, `rounded-field` — stays
  for the cashier's header, where no label or neighbouring field stands
  next to it.
- **Status** is a badge in words: *Aktif* as an `outline` badge, *Nonaktif*
  on `surface-container`, pushed back the way DESIGN.md greys unavailable
  items. *Manager* is the orange-tinted `default` badge. A voucher's five:
  *Aktif* `default`, *Terjadwal* `outline`, *Habis* `warning`, *Expired*
  and *Nonaktif* `secondary`.
- **A badge in a table cell** sits in the cell itself, or in a block, never
  as a grid or flex item: the badge clips (`overflow-hidden`), and as such
  an item its minimum width is zero, so the column shrinks under it and the
  table overflows its box (measured: a voucher list 368px wide in a 356px
  box at 390px). The voucher list's used count goes under the status on a
  phone as a `<p>` for that reason.
- **Destructive actions** are a filled `destructive` button when they stop
  something (deactivating), and an outline button with `error` text when
  they remove it (deleting), always behind a confirmation.
- **Fields in one row** keep their labels level (`content-start`), even when
  only one has a hint.
- **Stock** is a number and, when it matters, a word: *Menipis* is the
  `warning` badge with the count in `on-warning-container`; *Habis* is the
  `secondary` badge with the count in `on-surface-variant`, pushed back the
  way DESIGN.md greys an unavailable product; *Tanpa stok* is grey text. A
  count that is fine has no badge.
- **One choice of a few** — a menu's stock mode, the kind of stock
  adjustment, an outlet's dine-in mode — is a row of DESIGN.md's payment
  tiles (`ChoiceTiles`): equal `rounded-tile` tiles, the chosen one on
  `primary-container` with a `primary` border and a `primary-strong` label.
  They are radio buttons underneath, with a tile's hint as its description.
  Under a heading that already names the choice, the group's legend reads
  as the heading's description (`legendStyle="description"`).
- **Category icons** are full-colour emoji, as DESIGN.md's category tiles
  show them; a category without one gets an outline plate in `icon-muted`.
  The picker offers food and drink emoji as tiles styled like
  `category-tile-active` when chosen (`primary-container-muted`, `primary`
  border), and takes any other emoji typed below them.
- **Amounts** are typed in a field with its `Rp` in front, and grouped as
  they are typed.
- **Order** is changed with a pair of 44px arrow buttons on each row of an
  ordered list, not by dragging.

## Tables

- **The floor** (`TableFloor`, the admin's and the cashier's) is the area's
  grid on `surface-container-low` with `outline` lines, at most 960px wide
  (a cell 20px, as at 100%). A wall is an `icon-muted` bar; the cashier and
  a door are outlined marks with their names, a door's outline dashed.
- **A table's status** is a fill, a border and an icon, never the colour
  alone, and the key above the floor says what each means: *Tersedia*
  `surface` with an `icon-muted` border; *Terisi* `primary-container` with
  a `primary` border and the people icon; *Nonaktif* and *Nonaktif
  terjadwal* `surface-container` with a dashed border, and the ban or the
  clock icon. The icons are line drawings, coloured by their stroke. The
  same badges name the status in the lists.
- **Picked**, a table gets a 3px `primary-strong` ring. The keyboard's
  focus is a 2px `primary` ring around the table's box, apart from the
  table like the other focus rings, so a focused table never reads as
  picked; a tap or a click shows none (`focus-visible`). A table that can't
  be picked is `cursor-not-allowed`, its button disabled.
- **Below 840px** the floor never gets narrower than 720px (a cell 15px:
  a 3-cell table is a finger's target). It sits in a box that pans with a
  finger or the mouse, zooms with two fingers, and has zoom buttons
  (`ZoomPan`); a drag that panned isn't a tap on the table it began on.
- **The tables list** is an ordered-list row per table, like the
  categories: name, *4 kursi · Bulat*, the status with since when and how
  many sales, and the actions, which take a line of their own on a phone.
- **The layout editor:** the canvas, and beside it from 1280px (below it
  otherwise) the properties and the panel. A table on top of another gets
  an `error` ring and an `error-container` line names them; the selected
  item's corner is a `primary-strong` square to drag. The panel's items
  are rows with a grip, their name, and *Tempatkan* or *Tambah*.
- **Schedules:** *Akan datang* `outline`, *Berlangsung* `default`,
  *Selesai* and *Dibatalkan* `secondary`. An area's box in the form is
  checked, empty or a dash for some of its tables. An overlap's warning is
  a `warning-container` box naming the other schedules, with *Simpan tetap*
  and *Periksa lagi* in place of the submit button.
