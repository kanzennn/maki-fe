# maki-fe

Web app for Maki, the multi-outlet POS: the admin area (`/admin`, Owner and
Manager) and the PC cashier (`/pos`) in one React single-page app.

**Stack:** React 19 · TypeScript · Vite · TanStack Router and Query · Zustand
· axios · Tailwind CSS v4 · shadcn/ui · i18next · Vitest · Playwright

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
| `npm run lint` | ESLint (the layers' rules too) and the translation completeness check |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright (run `npx playwright install chromium` once first) |
| `npm run gen:api` | Regenerate `src/lib/api-schema.d.ts` from `../maki-be/api/openapi.yaml` |

`.github/workflows/ci.yml` runs the checks, the tests and the build, and the
end-to-end tests against maki-be, on every push and pull request; from
`main` it deploys the build to the VPS once deploys are enabled
([docs/deployment.md](docs/deployment.md)).

## Structure

```
src/app/          TanStack file routes, each folder with the _components/ only its routes use
src/components/   ui/ (shadcn as generated), shared/, layout/ (frames, navigation), <feature>/
src/hooks/        React hooks, and each feature's data hooks (TanStack Query over its usecases)
src/providers/    router, QueryClient, i18n, contexts
src/modules/      one per feature: types, repositories, usecases, validations, permissions, filters
src/lib/          http.ts (axios), session, the API's generated types, helpers without React
src/locales/      translations, one file per feature per language
```

Presentation (`app`, `components`, `hooks`, `providers`) depends on the
modules, never the other way round; ESLint holds it
([docs/architecture.md](docs/architecture.md#layers)).

Everything else is in [docs/README.md](docs/README.md).
