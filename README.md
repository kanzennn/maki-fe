# maki-fe

Web app for Maki, the multi-outlet POS: the admin area (`/admin`, Owner and
Manager) and the PC cashier (`/pos`) in one React single-page app.

**Stack:** React 19 · TypeScript · Vite · TanStack Router and Query · Zustand
· Tailwind CSS v4 · shadcn/ui · i18next · Vitest · Playwright

## Run locally

1. `npm install`
2. `cp .env.example .env` (the defaults work locally)
3. Start the backend in `../maki-be`, then `npm run dev`

The app runs on <http://localhost:3002> and proxies `/api` to the backend on
port 8080.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Route tree, type-check, production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint and the translation completeness check |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright (run `npx playwright install chromium` once first) |
| `npm run gen:api` | Regenerate `src/shared/api/schema.d.ts` from `../maki-be/api/openapi.yaml` |

`.github/workflows/ci.yml` runs the checks, the tests and the build, and the
end-to-end tests against maki-be, on every push and pull request; from
`main` it deploys the build to the VPS once deploys are enabled
([docs/deployment.md](docs/deployment.md)).

## Structure

```
src/app/        providers, router, i18n, root layout, the admin area's and the cashier's frames and navigation
src/routes/     TanStack file routes — thin
src/features/   one folder per feature (auth, dashboard, outlet, role, user, menu, pos, device, …)
src/shared/     API client, shadcn/ui, shared components, lib, hooks
src/locales/    translations, one file per feature per language
```

Everything else is in [docs/README.md](docs/README.md).
