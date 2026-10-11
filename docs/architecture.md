# Architecture

maki-fe follows the workspace
[React + Vite architecture standard](../../../docs/react-vite-architecture-standard.md).
This file records how this project applies it.

## Areas and routes

| Path | Route file | Screen | Access |
| --- | --- | --- | --- |
| `/` | `routes/index.tsx` | — | Redirects to `/admin` with a session, `/login` without |
| `/login` | `routes/login.tsx` | `features/auth` | Public; skipped with a live session. `?redirect=` returns there after sign-in |
| `/forgot-password` | `routes/forgot-password.tsx` | `features/auth` | Public |
| `/reset-password` | `routes/reset-password.tsx` | `features/auth` | Public; opened from the email as `#token=…` |
| `/verify-email` | `routes/verify-email.tsx` | `features/auth` | Public; opened from the email as `#token=…` |
| `/change-password` | `routes/_auth/change-password.tsx` | `features/auth` | Session required |
| `/pos` | `routes/_auth/pos.tsx` (the frame) and `pos/index.tsx` | `features/pos` | `checkout.create`, on one of the outlet's devices ([below](#the-cashier)); whoever only voids goes to `/pos/history` |
| `/pos/history`, `/pos/history/$orid` | `routes/_auth/pos/history/` | `features/pos` | `checkout.create` or `order.void`. `?q=`, `?page=` |
| `/pos/tables` | `routes/_auth/pos/tables.tsx` | `features/pos` | `checkout.create`; whoever only voids goes to `/pos/history` |
| `/admin` | `routes/_auth/admin/index.tsx` | `features/dashboard` | `dashboard.view`; anyone else goes to their first page ([below](#the-admin-area)) |
| `/admin/no-access` | `routes/_auth/admin/no-access.tsx` | `app/NoAccessPage` | A session whose permissions open no page |
| `/admin/outlets` | `routes/_auth/admin/outlets/index.tsx` | `features/outlet` | The Owner. `?q=`, `?status=`, `?page=` |
| `/admin/outlets/new` | `…/outlets/new.tsx` | `features/outlet` | The Owner |
| `/admin/outlets/$oid` | `…/outlets/$oid.tsx` (layout) and `$oid/index.tsx` | `features/outlet` | The Owner in any outlet; anyone else in their own (the layout), and the Info page is the Owner's |
| `/admin/outlets/$oid/edit` | `…/outlets/$oid_.edit.tsx` | `features/outlet` | The Owner; outside the outlet's tabs |
| `/admin/outlets/$oid/roles`, `…/roles/new`, `…/roles/$rid` | `…/$oid/roles/` | `features/role` | `role.view`; `new` needs `role.manage`, which also turns the detail into a form |
| `/admin/outlets/$oid/users`, `…/users/new`, `…/users/$uid` | `…/$oid/users/` | `features/user` | `user.view`; `new` needs `user.manage`. `?q=`, `?role_id=`, `?status=`, `?page=` |
| `/admin/outlets/$oid/menus`, `…/menus/new` | `…/$oid/menus/index.tsx`, `new.tsx` | `features/menu` | `menu.view`; `new` needs `menu.manage`. `?q=`, `?category_id=`, `?status=`, `?stock=`, `?page=` |
| `/admin/outlets/$oid/menus/$mid` | `…/menus/$mid.tsx` | `features/menu` | `menu.view`. Its form needs `menu.manage`, adjusting stock `stock.adjust`. `?page=` is the stock history's page |
| `/admin/outlets/$oid/menus/categories` | `…/menus/categories.tsx` | `features/menu` | `menu.view`; changing them needs `menu.manage`. Under `/menus`, so the Menu item and tab stay active |
| `/admin/outlets/$oid/devices` | `…/$oid/devices.tsx` | `features/device` | The outlet's Manager, or the Owner: the fixed roles, as the API has it. `?page=` |
| `/admin/outlets/$oid/vouchers` | `…/$oid/vouchers.tsx` | `features/voucher` | The outlet's Manager, or the Owner: the vouchers its cashier can take, to read. `?q=`, `?status=`, `?page=` |
| `/admin/outlets/$oid/tables` | `…/$oid/tables/index.tsx` | `features/table` | `table.view`; changing tables needs `table.manage`. `?area=` is the area shown, else the first |
| `/admin/outlets/$oid/tables/areas` | `…/tables/areas.tsx` | `features/table` | `table.view`; changing them needs `table.manage`. Under `/tables`, so the Meja item and tab stay active |
| `/admin/outlets/$oid/tables/layout/$aid` | `…/tables/layout.$aid.tsx` | `features/table` | `table.manage`; the editor itself from 840px wide |
| `/admin/outlets/$oid/tables/schedules`, `…/schedules/$sid` | `…/tables/schedules/index.tsx`, `$sid.tsx` | `features/table` | `table.view`; changing or cancelling needs `table.manage`. `?status=`, `?page=` |
| `/admin/outlets/$oid/tables/schedules/new`, `…/schedules/$sid/edit` | `…/schedules/new.tsx`, `$sid_.edit.tsx` | `features/table` | `table.manage` |
| `/admin/vouchers`, `…/vouchers/new` | `routes/_auth/admin/vouchers/index.tsx`, `new.tsx` | `features/voucher` | The Owner. `?q=`, `?status=`, `?page=` |
| `/admin/vouchers/$vid` | `…/vouchers/$vid.tsx` | `features/voucher` | The Owner. `?page=` is the uses' page |
| `/admin/vouchers/$vid/edit` | `…/vouchers/$vid_.edit.tsx` | `features/voucher` | The Owner; a form of its own |
| anything else | `routes/__root.tsx` | `shared/components/NotFound` | Public |

`_auth.tsx` is a pathless layout route. Its `beforeLoad` awaits
`ensureSession()` — the access token in memory, or else one refresh with the
cookie, which is how a reload keeps the user signed in — and sends a visitor
without a session to `/login?redirect=<where they were going>`. A user whose
`must_change_password` is set is held on `/change-password`. Its component,
`SignedInLayout`, adds the header — the app name, which leads to the user's
start page, their outlet, their name and sign-out — and returns to `/login`
if the session ends while a screen is open.

The router plugin splits every route into its own chunk
(`autoCodeSplitting`), so the admin and cashier areas never download each
other's code. `src/routeTree.gen.ts` is generated by the plugin and is
committed, because `npm run build` type-checks before Vite runs.

## The admin area

**The frame.** `routes/_auth/admin.tsx` renders `app/AdminLayout.tsx`
([design-system.md](./design-system.md#admin-navigation)):

- from 840px wide, a sidebar;
- below it, a bottom navigation bar with the same items.

**What the navigation offers.** `app/navigation.ts` builds the items from
the user's permissions:

| Item | Shown to |
| --- | --- |
| Dasbor | `dashboard.view` |
| Outlet | The Owner |
| Voucher | The Owner (all of them), and the Manager (their outlet's) |
| Menu | `menu.view`, in the user's outlet |
| Meja | `table.view`, in the user's outlet |
| Role | `role.view`, in the user's outlet |
| User | `user.view`, in the user's outlet |
| Perangkat | The Manager, in their outlet |
| Kasir | `checkout.create` |

Voucher sits after Outlet for the Owner, and after Perangkat for the
Manager.

The Owner reaches an outlet's users, roles, menu and tables from that
outlet's page.
The first item is the user's start page:

- sign-in and `/` lead to `/admin`;
- `/admin` redirects anyone without `dashboard.view` to their first item, so
  a cashier lands on `/pos`;
- a user with no item at all lands on `/admin/no-access`.

**Guards.** Each route checks its own permission in `beforeLoad` and sends
anyone else to `/admin`, which picks their start page. Components ask
`useCan()('user.manage')` (`shared/hooks/useCan.ts`, over `can()` in
`shared/lib/permissions.ts`) rather than checking a role by name. Both read
`GET /me`'s `permissions` from the session. A hidden button is convenience:
the backend checks every request.

**One URL for an outlet's pages.** Roles and users live under
`/admin/outlets/$oid/…` for the Owner and the Manager alike, mirroring the
API's scope. The `$oid` route's `beforeLoad` puts the outlet — time zone
included — into the route context:

- for the Owner, loaded from `GET /outlets/{oid}` (404 → not found);
- for anyone else, their own from `GET /me`;
- for any other outlet, it sends the user back to `/admin`.

`OutletLayout` gives the Owner the outlet's name and tabs (Info, User, Role, Menu, Meja, Perangkat, Voucher),
and wraps the tabs' pages in `NestedPageHeadings`, so their `PageHeading`
becomes an `<h2>` under the outlet's `<h1>`. A Manager's pages have no
frame: the sidebar leads there.

**Account rules on screen.** `features/user/manage.ts` mirrors the server's
rules for managing an account:

- one's own account is read only;
- the Owner manages Manager accounts and only promotes staff;
- nobody else manages a Manager;
- nobody manages staff who hold a permission they lack;
- a role is offered only if the giver holds all of its permissions.

The page says why an action is missing. In a role's checklist:

- a permission the user lacks is locked, unless the role already had it;
- ticking "manage" ticks "view".

## The cashier

**The frame.** `routes/_auth/pos.tsx` lets in whoever sells
(`checkout.create`) or voids (`order.void`) in an outlet, puts the outlet's
ID into the route context, and renders `app/PosLayout.tsx`
([design-system.md](./design-system.md#cashier-screens)). Its navigation
(`posNavItems`) is Kasir, Meja when the outlet has tables, Riwayat and, for
whoever has a page there, the way back to the admin area. The frame loads
the floor for whoever sells, which says whether there are tables: none
where the outlet seats its customers by number stands. Receipts print from the frame, whichever page asks.

**The device.** `/pos` asks `GET /pos/device` first. A browser the outlet
hasn't activated, or has revoked, gets the screen that says so
(`DeviceGate`); its Manager, signed in on it, names it and activates it
there, and the browser gets the `maki_device` cookie, which no script reads
and every API call carries (`credentials: 'include'`). The answer also says
how the device numbers its receipts: its prefix, the outlet's day and the
next count.

**The catalog** (`catalogQuery`) is the outlet with its rates, the payment
methods on, how the outlet seats its dine-in customers (`dine_in_mode`), and
the menus in the cashier's order. It loads again after
each sale and every half minute; the server decides every sale against the
stock as it is. A category tile and the search narrow the menus, keeping
that order (`browse.ts`).

**The cart** is a Zustand store (`features/pos/cart.ts`), outside any one
component, so it stays while the cashier looks at today's orders; nothing of
it is stored in the browser. It holds lines of menu (with its name then, to
say which one went if the catalog drops it), qty and note, never prices,
which are always the catalog's, and it is its user's: someone else
signing in on the browser starts with an empty one. Each time the catalog
loads, the order follows it (`reconcile`): a menu no longer on sale, or with
none left, comes out, one with less stock than ordered is cut to what there
is, and the screen says so. A line takes at most the stock there is.

**The totals** are `computeTotals` (`features/pos/totals.ts`), the server's
rule in integers alone. Its test runs every case of
`maki-be/api/test-vectors/order-totals.json`, the file the backend's tests
read too.

**The voucher** the customer gives is typed in Detail Items
(`VoucherField`) and checked with `POST /vouchers/validate`, which needs the
till as a sale does. Its terms go in the cart, one per order, and its
discount is worked out again as the cart changes (`voucherDiscount`,
`features/pos/voucher.ts`, run against
`maki-be/api/test-vectors/voucher-discounts.json`), before the service
charge and the tax. Short of its minimum spend the panel says so and Pay is
off. A refused code says why under the field; the summary and the receipt
name the voucher ("Potongan (KODE)"). It stays as it was sent while a sale
is pending, and goes with the sale.

**Tables.** The floor (`floorQuery`, `GET /pos/tables`) is the outlet's
areas that hold tables, in order, with each table's status now. It loads
again whenever it is shown, after a sale, a void or a release, and every
half minute (`staleTime: 0`, `refetchInterval`).

- `/pos/tables` (`FloorPage`) shows it an area at a time (`FloorView`): the
  key, the layout and the tables not placed on it. A table opens its
  detail: its status and, while customers are seated there, since when and
  how many sales; *Pesan di meja ini* while it can be picked (available or
  occupied), which makes the order dine-in at that table and opens the
  sell screen; and *Kosongkan Meja* once its customers have left, after
  asking (`POST /tables/{tid}/release`).
- In Detail Items, a dine-in order has *Pilih meja* when the outlet has
  tables, always optional. It opens the same floor in a dialog
  (`TablePicker`), loaded again, where only an available or occupied table
  can be picked. The table picked shows with *Ganti* and the button that
  lets it go. A takeaway lets go of it.
- The table is the cart's (`table`, by its name when picked) and goes with
  the sale as `table_id`.

**Number stands.** Where the catalog says `number`, the outlet seats its
dine-in customers by the number stands the cashier hands out, and a waiter
brings the order to the stand:

- a dine-in order has the *Nomor papan* field in Detail Items instead of
  *Pilih meja*: the number as the stand shows it (`stand.ts`, the server's
  rule: 1–10 letters, digits and hyphens, a hyphen only between them), sent
  trimmed and in capitals as `stand_number`. Pay stays off until it is
  one the server takes, and what it takes is said once the cashier leaves
  the field;
- the number is the cart's (`standNumber`); a takeaway and the next customer
  let go of it, and it stays as it was sent while a sale is pending;
- the way the outlet seats its customers follows the catalog as it loads,
  as its menus do: a table picked where the outlet now takes number stands,
  or a number typed where it now seats at tables, is left out of the order,
  and the screen says so, until the cashier's next touch keeps it so;
- `/pos/tables` says the outlet takes number stands instead of showing a
  floor, the catalog being the one that says so.

**Charging** (`features/pos/checkout.ts`) never charges twice:

- an order is built once, with its own ID (a CUID2 shape from the browser's
  cryptographic random numbers, `order-id.ts`) and the device's next receipt
  number of the outlet's day (`receipt-number.ts`);
- no answer, or a 5xx, leaves it **pending**: it is sent again exactly as it
  was, by itself twice, then from the Kirim ulang button, and the cart can't
  change meanwhile. The server answers a resend with the order as it took
  it. Abandoning it says to check today's orders first;
- `order_no_taken` (the cashier open in two tabs) renumbers it from
  `GET /pos/device` and sends it again under the same ID;
- a voucher's refusal (used up, expired, turned off, another outlet's,
  short of its minimum) takes the voucher off the order, and the sell
  screen says why;
- `table_unavailable` (the table was turned off, scheduled off or deleted
  since it was picked) takes the table off the order, loads the floor
  again, and the sell screen says why, from the refusal's `details.status`;
- `dine_in_mode_changed` (the Manager changed how the outlet seats its
  customers since the catalog loaded) takes off the table, or the stand's
  number, the way the refusal's `details.mode` names has no place for,
  loads the catalog and the floor again, and the sell screen says so;
- any other refusal reloads what it names — the catalog, or the device —
  and the sell screen says what changed (a price, the stock, the rates, the
  method) before the cashier charges again. `total_changed` with a voucher
  checks its terms again too, and takes it off if it can't be taken any
  more;
- after a sale, the device's next number moves on at once, and the catalog,
  the tables, today's orders and the menu pages load again.

**Receipts** (`Receipt`) are in the outlet's language and number style,
whatever the screen's (`i18n.getFixedT(outlet.locale)`), as the spec prints
them. Printing renders the receipt into an element of its own outside
`#root`, and `window.print()` sends it, alone, to the till's 58 mm roll
(`styles/globals.css`, `@media print`).

A receipt names the order's table, under its type, or shows its stand's
number large under the outlet's name, for the waiter who brings the order.

**Today's orders** (`/pos/history`) are the outlet's day, newest first,
searchable by part of the receipt number, each with its table or its
stand's number ("No. 12"). An order's page shows its receipt
to print again, and, with `order.void`, voids it, for a reason.

**The outlet's devices** (`/admin/outlets/$oid/devices`): who activated
each, when it was last used, and revoking one. A device is added from the
device itself, so the page says how.

## Vouchers

**The Owner's** (`/admin/vouchers`): the list (code and name, discount with
its maximum and minimum, outlets, used of the quota, period, status), with
its search and status filter; a voucher's page (its terms, when it was
first used, turning it on or off, deleting it while no sale has used it,
and its uses, newest first); and the form for a new one or a change.

**The form** (`features/voucher/schemas.ts`) takes a percentage with a comma
or a point and at most two decimals, sent as basis points, and amounts as
rupiah. Start and expiry are `datetime-local` fields read as **WIB**,
whatever the browser's time zone (`toWibInput`, `fromWibInput`: UTC+7, no
daylight saving), and every time on these pages is shown in WIB and says
so. Once a sale has used a voucher (`first_used_at`), its code is read
only, its type locked, and the form says why; the server's own refusals
(`locked`, `decrease`, `earlier`, `future`) show on their fields.

**An outlet's Manager** reads the vouchers its cashier can take at
`/admin/outlets/$oid/vouchers`, the same list without links or a create
button; the Owner reaches it from the outlet's tabs too.

## Tables

**The tables page** (`/admin/outlets/$oid/tables`) is an outlet's tables an
area at a time: the area's layout as the tables stand now (`TableFloor`,
read-only, with the key) and its tables in a list, each with its seats,
shape, status, and while customers are seated there since when and how
many sales. Whoever has `table.manage` adds and changes tables in a
dialog, turns them on or off, and deletes one no customers are seated at.
A table that moves to another area leaves the old area's layout, and the
dialog says so. The areas (`…/tables/areas`) are ordered like categories,
a step at a time.

**The layout editor** (`…/tables/layout/$aid`) draws the area's 48 × 32
grid in SVG, without a library:

- its rules are `features/table/layout.ts`, apart from any component and
  the same as the server's: a box stays on the grid, a table is 2 to 16
  cells a side and a decoration 1 cell up to the grid, a quarter turn swaps
  width and height, and tables on top of one another hold the save back;
- a table or decoration moves by dragging it and resizes from its corner,
  a cell at a time; the panel's tables and decorations are dragged on, or
  put in the first free spot with their button; the keyboard does it all
  on the one focused (arrows, Shift+arrows, R, Delete, Esc), and so do the
  typed properties. Each change is announced (`role="status"`);
- Simpan sends the whole layout with the version it opened on. A
  `layout_changed` answer — the layout or a table of the area changed
  since — says so and offers the layout as it is now. Leaving with changes
  not saved asks first (`useBlocker`, and the browser's own question on a
  reload);
- below 840px (`useMediaQuery`) the page says the editor needs a wider
  screen, and the tables page drops its link.

**Table schedules** (`…/tables/schedules`): the list with its status
filter, a schedule's page, and the form for a new one or a change. Its
times are `datetime-local` fields in the **outlet's own time zone**
(`toZonedInput`, `fromZonedInput` in `shared/lib/time.ts`), labelled with
its name ("Mulai (WITA)"), unlike vouchers, which are WIB everywhere. The
tables are picked one by one or a whole area at a time. A `409
schedule_overlaps` is a warning, not a refusal: the form names the other
schedules, and *Simpan tetap* sends it again with `confirm_overlap`. A
schedule that is finished or cancelled can't change any more.

**The dine-in mode** heads the tables page (`DineInModeCard`): whoever has
`table.manage` picks *Meja* or *Nomor papan* and saves it (`PUT
/dine-in-mode`), once a dialog has said what changes at the cashier from
the next sale on; the Owner and whoever has `table.view` read it. In Mode
Nomor a word under it says the areas and tables below stay for Mode Meja.

The Owner reads all of it from the outlet's Meja tab, without the buttons.

## Layout

```
src/
  main.tsx              loads globals.css and i18n, mounts <Providers>
  routeTree.gen.ts      generated, committed
  app/
    providers.tsx       QueryClientProvider + RouterProvider
    router.tsx          router instance; context = { queryClient, auth }
    route-defaults.ts   every route's pending, error and not-found states (router and tests)
    query-client.ts     no retries on 4xx, two on server or network errors
    i18n.ts             i18next: languages, detection, fallback
    RootLayout.tsx      root <Outlet>, focus handling
    AdminLayout.tsx     the admin area's sidebar and bottom navigation
    PosLayout.tsx       the cashier's frame: the same navigation, the cart bar's place, printing
    NavLink.tsx         a navigation item, for both frames
    navigation.ts       the navigation items a user's permissions open, in each area
    NoAccessPage.tsx    for a user whose permissions open no page yet
  routes/               thin: path, guard, loader, component from features/
  features/<feature>/   api.ts (queries, mutations), schemas.ts (zod), components/
  features/auth/        sign in/out, ensureSession, safeRedirect, the sign-in screens
  features/outlet/      the Owner's outlets: list, form, the outlet's frame and Info page
  features/role/        an outlet's roles: list, checklist form, detail
  features/user/        an outlet's accounts: list, create, detail and its dialogs; manage.ts
  features/menu/        an outlet's categories and menus: lists, the menu form, the stock
                        dialogs and history, the categories page with its emoji picker
  features/pos/         the cashier: catalog, cart, totals, receipt numbers, checkout, receipts,
                        today's orders and voids, the tables and picking one
  features/device/      an outlet's cashier devices, for its Manager and the Owner
  features/voucher/     the Owner's vouchers: list, form, detail with its uses; an outlet's list
  features/table/       an outlet's tables: the tables page, areas, the layout editor (layout.ts,
                        its rules), the schedules
  shared/
    api/                client.ts (auth fetch, refresh), schema.d.ts (generated),
                        query-keys.ts, roles.ts (every role of an outlet), me.ts (refreshMe)
    ui/                 shadcn/ui components, owned by the project
    components/         PageHeading, PageHeader and BackLink, FormField, SelectField,
                        SearchField, Pagination, StatusBadge, ConfirmDialog, FormMessage,
                        Detail, PageState, LanguageSwitch, RouteError, NotFound, and the
                        menu's NumberField, TextareaField and CategoryIcon, which the
                        cashier uses too, ChoiceTiles, which the voucher form uses too,
                        and TableFloor and ZoomPan, the admin's and the cashier's floor
    lib/                session, permissions, language, money, number, percent (rates and
                        typed percentages), time (an outlet's zone, datetime-local fields),
                        floor (the grid), api-error-message, form-errors, list-search,
                        not-found, utils (cn)
    hooks/              useFocusHeadingOnNavigate, useCan, useFieldError, useMediaQuery
  locales/<lang>/       one JSON file per feature (namespace)
  styles/globals.css    Tailwind, design tokens, base styles
  test/                 setup.ts, app.tsx (render the app, stub the API), fixtures.ts,
                        pos.ts (the cashier's API on a device not activated), tables.ts
                        (areas, tables, a layout, schedules)
  types/                i18next key types, env variable types
```

## State

- **Server state:** TanStack Query only (`app/query-client.ts`). Route
  loaders prime each page's queries with `ensureQueryData`, and the page
  reads them with `useSuspenseQuery`, so a page renders with its data.
- **Query keys** come from `shared/api/query-keys.ts` rather than each
  feature's `api.ts`, because the features change each other's data:
  - a new user changes the roles' user counts and the outlet's Managers;
  - a renamed role changes the user rows that show it;
  - a new outlet brings a new cashier role;
  - a category's name, icon or status changes the menu rows that show it,
    and a new or deleted menu its category's count; the cashier's sales
    and voids change the stock the menu pages show;
  - any change to an outlet's areas, tables, layouts or schedules changes
    the others and the cashier's floor (`queryKeys.tables.all`), and the
    cashier's sales, voids and releases change the tables' statuses.
  
  Each feature builds its keys from there, so invalidation reaches all of
  them. Every role of an outlet, for filters and pickers, is
  `allRolesQuery` in `shared/api/roles.ts`, for the same reason. After a
  role changes, staff (who hold one) reload their own `GET /me`.
- **List filters** live in the address bar (`validateSearch`, with
  `shared/lib/list-search.ts` for `q` and `page`), so Back and a shared link
  keep them. A new filter starts again from the first page.
- **Session:** a Zustand store in `shared/lib/session.ts` holding the access
  token **in memory** and the signed-in user from the same response — the
  one piece of server data outside the Query cache, because route guards read
  it synchronously and the cache may drop an unobserved query. Neither ever
  touches `localStorage`. The refresh token is the backend's `HttpOnly`
  cookie, which no script can read.
- **The cart:** a Zustand store of its own (`features/pos/cart.ts`), for
  the same reason as the session: it outlives the sell screen while the
  cashier looks at today's orders or the tables. Like the session it is
  memory only.
- **The layout editor's draft** is the page's own state, with the layout
  it opened on beside it: a draft that saves the same layout is no change.
- **Local UI state:** `useState` in the component.

## API client

`shared/api/client.ts` exports `api` (openapi-fetch typed by
`schema.d.ts`) and `unwrap()`:

- every request carries `Authorization: Bearer …` when signed in,
  `Accept-Language` with the UI language, and cookies (`credentials:
  'include'`);
- a `401` from anything but the sign-in endpoints refreshes the session
  **once** and retries the request, body included; if the refresh fails too,
  the session is cleared and `SignedInLayout` returns to sign-in;
- `refreshSession()` is shared: overlapping calls wait for one refresh, and
  tabs take turns through the Web Locks API. A `409 refresh_superseded` —
  another tab refreshed with the same cookie a moment ago — is retried once;
- an error response becomes an `ApiError` with `status`, `code`,
  `requestId` and `details`; a response without the envelope (a proxy's 502)
  becomes `internal_error`;
- screens show `apiErrorMessage(t, error)`: the translation of `code`, the
  server's message for a code without a translation, and a network message
  when there was no response.

## Forms

- react-hook-form with each feature's zod schemas, which follow the server's
  own rules (an outlet code of 2 to 10 letters and digits, passwords of 8 to
  128 characters, …). The server checks again and has the last word.
- Schemas' messages are rule names (`required`, `format`, …), which
  `useFieldError` shows from `common:validation`. The field's hint says what
  the rule is.
- A `validation_failed` answer goes onto the fields it names, through
  `placeFieldErrors` (`shared/lib/form-errors.ts`). A code about one field —
  `outlet_code_taken`, `username_taken`, `role_name_taken`,
  `category_name_taken`, `menu_sku_taken`, `area_name_taken`,
  `table_name_taken` — goes onto that field, already translated
  (`type: 'api'`). Anything else shows above the form.
- A price or a count is a `NumberField` (`shared/components`): the form keeps the
  digits, and the field shows them grouped as they are typed (`25.000`),
  with the caret kept after the digit it was after.
- Stock: a menu's form sets its stock mode, the count tracking starts from
  and the alert, but never the count itself, which only changes through the
  stock dialog. The dialog works out the count it will leave, refuses to
  take more than there is, and picks the reason a type usually has until
  the user picks one. Whoever adjusts stock without managing the menu sets
  the alert in a dialog of its own.
- Categories and table areas move a step at a time with up and down
  buttons, not by dragging, so the keyboard can do it too. The list takes the new order at
  once and goes back if the server refuses; the move is announced, and focus
  stays on the moved category's button.
- An action that takes effect at once asks first: deactivating, deleting,
  promoting (`ConfirmDialog`). Deleting an outlet needs its name typed again.
  A result that isn't visible on the page is announced (`FormNotice`,
  `role="status"`).

## Loading, errors and not found

`app/route-defaults.ts` gives every route its own pending, error and
not-found states (`shared/components/PageState.tsx`), rendered where the page
would be, so the admin frame stays around them:

- an API refusal (4xx) is shown in words;
- anything else gets the generic message and the request ID.

Loaders wrap the query for a single outlet, role or user in `orNotFound`,
which turns the API's 404 into the route's not-found page. Those routes set
`notFoundComponent` themselves. When it picks where to render a not-found,
TanStack Router looks only for a route's own `notFoundComponent`, not the
router's default, so without it the page would fall back to the root's
full-screen one. The root keeps its full-page `RouteError` and `NotFound`
for unknown addresses.

## Signing in

- `/login` posts `client: web`, so the refresh token comes back as the
  `maki_refresh` cookie (`HttpOnly`, `SameSite=Strict`, path
  `/api/v1/auth`). `?redirect=` only accepts a path inside the app
  (`safeRedirect`), so a crafted link can't send anyone elsewhere.
- Emailed links carry their token in the fragment (`#token=…`), which never
  reaches a server. `useLinkToken` reads it once and replaces the address
  without it, so it isn't left in the history.
- `/verify-email` waits for a press instead of confirming on load: mail
  scanners that open links — and run their scripts — would use the token up.
- Development: Vite proxies `/api` to the API (`API_PROXY_TARGET`, default
  `http://localhost:8080`) **keeping the browser's `Host`**, as Caddy does.
  The API recognises a same-origin request by it and doesn't apply the CORS
  allowlist to it.

## Text and formatting

- Indonesian is the default; English is the second language. Before sign-in
  the language comes from the switch on the sign-in screens (remembered on
  the device), else the browser's if it is one of them; after sign-in it is
  the user's own setting from the server, the same on every device.
- `src/types/i18next.d.ts` types the keys from the Indonesian files, so a
  wrong key fails to compile. Add each new namespace there. Permission
  codes and modules come from the server's catalog, so their labels
  (`role:permissions.<code>`) fall back to the code when the app doesn't know
  one yet.
- `scripts/check-locales.mjs` (part of `npm run lint`) fails when a key
  exists in one language but not the other, ignoring plural suffixes.
- `formatRupiah` shows integers only, `Rp 25.000` / `Rp 25,000`. Counts are
  grouped the same way by `formatNumber`, and a change to one is signed by
  `formatChange` (`+5`, `-3`).
  `formatDate`, `formatDateTime` and `formatDateTimeRange` (a day they
  share written once) always take the outlet's time zone: the user list
  and detail, the tables and the schedules read it from the `$oid` route's
  context.
- An outlet's tax and service charge are typed with a comma or a point and
  shown the way the language writes them (`5,5` / `5.5`).

## Accessibility

- Each page renders one `PageHeading` (`<h1 data-page-heading>`), and focus
  moves to it after every client-side navigation. Under the Owner's outlet
  frame it is an `<h2>`, and `SectionHeading` follows one level below.
- Every field, filters included, has a visible label, and its error and
  hint are tied to it with `aria-describedby`.
- Status is text as well as a tint (`StatusBadge`).
- Dialogs are Radix's, with their focus handling. Targets are at least 44px.
- `<html lang>` follows the UI language.

## Testing

- `npm run test` (Vitest, jsdom), with the API stubbed at `fetch` (never
  the client module):
  - the shared helpers: money, time, `cn`, permissions, list search;
  - the API client (refresh and retry, shared refreshes, 409) and error
    messages;
  - routing (the session guard, must-change-password, the admin navigation
    per user, every page's guard, not found inside the frame);
  - the sign-in screens;
  - the outlet, role, user and menu pages, and their rules (`manage.ts`, the
    schemas): the menu list and its filters, the menu form, the stock
    dialogs and history, the categories and their order, for the Manager, a
    storekeeper and the Owner;
  - the cashier's rules: the totals and a voucher's discount against the
    shared vectors, the cart and how it follows the catalog, receipt numbers
    and the outlet's day, order IDs, the menu filter;
  - the cashier's screens: a device not activated and its activation, the
    menus' order and stock, the cart, cash and change, the receipt in the
    outlet's language and its printing, a sale with no answer sent again
    as it was, a taken receipt number renumbered under the same ID, a
    changed price and short stock, a voucher (its discount following the
    cart, its minimum spend, a refused code, a sale that refuses it, a
    changed total), today's orders and a void, and the devices page;
  - the voucher pages and their schema: the Owner's list and filters, the
    form in WIB and basis points, a used voucher's locks, its page with its
    uses, turning it off and deleting it, and the Manager's list;
  - the tables: the layout editor's rules (`layout.ts`), the schemas, the
    tables page and its dialogs, the areas and their order, the editor (by
    keyboard and typed properties, tables on top of one another, a stale
    layout, leaving with changes, a narrow screen), and the schedules in
    the outlet's zone with an overlap's warning, for the Manager and the
    Owner;
  - the cashier's tables: picking one, letting it go, its refusal, the
    floor page with a table's detail and its release, ordering at a table,
    zooming on a phone, and the table on the receipt and in today's
    orders.
  
  `src/test/app.tsx` renders the whole app signed in as a fixture user
  (`serve`, `renderApp`, `bodyOf`). `src/test/fixtures.ts` holds the Owner,
  a Manager, a supervisor, a cashier, an outlet, its roles, and its
  categories and menus.
  `src/test/setup.ts` stubs `ResizeObserver`, which Radix's checkbox needs
  and jsdom lacks, and gives `findBy` 5 seconds instead of 1: the whole
  suite runs its files at once, each in a jsdom of its own, and on a busy
  machine a page took longer than a second to appear in a different file
  each run.
- `npm run test:e2e` (Playwright) runs against the production build
  (`vite preview`, which proxies `/api` like the dev server). The smoke test
  needs nothing else. The others need a running maki-be, and skip without
  it:
  - **Sign-in tests** (`e2e/auth.spec.ts`): an account they may change.
  - **Admin tests** (`e2e/admin.spec.ts`): the Owner. The Owner opens an
    outlet and gives it a Manager. The Manager chooses a password, sets up a
    role and a cashier, and deactivates the cashier; then sets up categories
    and menus and adjusts a menu's stock, which the Owner looks over. Each
    run makes its own outlet and accounts.
  - **Cashier tests** (`e2e/pos.spec.ts`): the Owner too, whose outlet,
    Manager, cashier and menu are set up through the API. On screen, the
    Manager activates the browser as a till, sells with change and a
    receipt, finds the sale in today's orders and voids it; the cashier
    sells on the same till, then with a voucher the Owner made for the
    outlet, which the Owner then sees used; the Manager revokes the till,
    and it can't sell anymore.
  - **Voucher tests** (`e2e/voucher.spec.ts`): the Owner too. The Owner
    makes a voucher for an outlet set up through the API, finds it, gives
    it more uses, turns it off and on, and deletes another no sale used;
    the outlet's Manager reads it, with nothing to change it with.
  - **Table tests** (`e2e/tables.spec.ts`): the Owner too, for an outlet in
    WITA and its Manager. The Manager makes and orders areas, adds tables,
    arranges a layout by keyboard, by dragging from the panel and across
    the canvas, and by typed properties, meets a layout changed in another
    tab, schedules tables off (overlapping, and from now), and turns a
    table off and deletes one; the Owner reads it all. The cashier tests
    sell at a table too, release it, meet a table turned off after it was
    picked, and zoom the floor on a phone.

  | Variable | Value |
  | --- | --- |
  | `API_PROXY_TARGET` | The API, e.g. `http://127.0.0.1:18081` |
  | `E2E_USERNAME`, `E2E_PASSWORD` | Sign-in tests: an Owner account whose email isn't confirmed yet |
  | `E2E_WORKER_LOG` | Sign-in tests: the worker's output file, where the development log mailer writes the emailed links |
  | `E2E_OWNER_USERNAME`, `E2E_OWNER_PASSWORD` | Admin, cashier, voucher and table tests: the backend's Owner |
  | `PW_CHANNEL` | `msedge` or `chrome` to use a browser already installed instead of `npx playwright install chromium` |

  Run the backend against a throwaway schema (`DATABASE_URL` with
  `&search_path=<schema>`, then `api migrate` and `api create-owner`) so the
  tests never touch real data. The sign-in tests reset the Owner's password,
  so run the admin, cashier, voucher and table tests first, in a run of
  their own:
  `npx playwright test e2e/admin.spec.ts e2e/pos.spec.ts e2e/voucher.spec.ts e2e/tables.spec.ts`,
  then the rest.
