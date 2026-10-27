# maki-fe documentation

| Doc | Covers |
| --- | --- |
| [architecture.md](./architecture.md) | The layers and how ESLint holds them, the modules, areas and routes, the admin area (navigation, guards, an outlet's pages), the cashier (devices, catalog, cart, vouchers, tables, charging without charging twice, receipts and printing, today's orders), the Owner's vouchers, an outlet's tables (the layout editor, schedules), layout, state and list pages, the API client (axios), validation and forms, loading and errors, i18n, accessibility, testing |
| [security.md](./security.md) | The headers the app is served with and its CSP, tokens and cookies, build-time configuration, errors |
| [deployment.md](./deployment.md) | The build, hosting on the VPS's Caddy (routes, the SPA fallback, caching, releases), the pipeline and its deploy, rollback, the pre-launch checks |
| [design-system.md](./design-system.md) | How `Maki/DESIGN.md` maps onto Tailwind tokens and shadcn/ui, the components and what was changed in them, icons, the admin navigation, the cashier's screens, the admin screens and the tables |

`offline.md` is added when there is something project-specific to put in
it.

## The short version

- Follows the workspace standard in
  [`docs/react-vite-architecture-standard.md`](../../../docs/react-vite-architecture-standard.md);
  this project is its reference implementation.
- The product spec is
  [`Spesifikasi Fitur POS Multi-Outlet.md`](../../Spesifikasi%20Fitur%20POS%20Multi-Outlet.md),
  the design system is [`DESIGN.md`](../../DESIGN.md).
- A client-rendered SPA built to static files; the backend is `../maki-be`.
- Layered: routes and components (presentation) call each feature's
  usecases (`src/modules/<feature>/`), which validate and then call its
  repositories; every request goes through one axios instance
  (`src/lib/http.ts`). ESLint fails an import that breaks the layers.
- API types are generated from `../maki-be/api/openapi.yaml` and never
  written by hand.
- Every user-facing string comes from `src/locales/`; `npm run lint` fails
  when a key is missing in one language.
- What a user sees follows `GET /me`'s permissions: the Owner manages
  outlets and their Managers, and the vouchers, and reads each outlet's
  tables; Managers and staff their outlet's roles, users, menu with its
  stock, and tables (areas, layouts, schedules), and Managers read their
  outlet's vouchers; the cashier sells on a device its outlet's Manager
  activated, at a table or not, and releases tables. The backend checks every request regardless.
- The cashier charges with the server's rules for totals and a voucher's
  discount, read from the backend's shared test vectors, and never twice:
  an order is built once, with its own ID, and sent again as it was until
  it has an answer.
- Voucher times are WIB for every outlet, whatever the browser's zone;
  table schedules are in each outlet's own zone.

## Known trade-offs and open items

- **The dashboard is a placeholder.** Signing in works end to end —
  sign-in, refresh, sign-out, password change, reset and email confirmation
  — and so do outlets, roles, users, the menu with its stock, devices and
  the cashier online; the dashboard still shows a heading and a "coming
  with the module" line.
- **The cashier is online only, in cash.** QRIS and debit show as coming
  soon. A voucher needs the server to
  check it, so it stays online-only when the offline mode comes. A reload empties the
  cart, which is never stored in the browser, and a sale whose answer never
  came is let go of only with a warning to check today's orders.
- **Receipts print through the browser** to the till's 58 mm printer, with
  the browser's print dialog. Printing without it (kiosk mode) and
  Bluetooth printers on Android come later.
- **The layout editor needs a wide screen** (840px and up): on a phone the
  tables page only shows the layout. A table's place is a box of whole
  cells; the cashier draws a table in its shape, not turned.
- **An outlet's areas load as one page** of the API's largest, 100, as its
  categories do; its tables, for a schedule's form, a page of 100 at a
  time until they are all in.
- **Menus have no photos yet.** They show their category's emoji until the
  upload milestone brings photos.
- **An outlet's categories load as one page** of the API's largest, 100:
  the category filter, the menu form and reordering need them all. An
  outlet with more would need a picker that searches.
- **Permissions change on the next page load.** A user whose role changes
  while the app is open keeps the old menu until they reload or sign in
  again; the server applies the new permissions from their next request
  anyway. A role edited by staff reloads their own permissions at once.
- **Signing out doesn't reach other tabs at once.** The server ends the
  session and the cookie goes, so another tab finds out at its next request
  (a 401, then a failed refresh) rather than immediately.
- **No offline mode yet.** vite-plugin-pwa and Dexie arrive with the `/pos`
  offline work (standard §8).
- **Touch targets.** shadcn's default button is 36px high. Every screen
  gives each button, field and navigation item at least 44px (`h-11`); the
  cashier's stepper looks small, with a 44px target.
