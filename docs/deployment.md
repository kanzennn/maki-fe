# Deployment

How maki-fe gets to production: a static build, served by the VPS's Caddy
on the same domain as the API, behind the server's own Nginx, which holds
the certificate. The server, its stack and its first setup are
[maki-be's deployment.md](../../maki-be/docs/deployment.md).

## The build

```sh
npm ci
npm run build    # tsr generate, tsc -b, vite build → dist/
```

`dist/` is the whole app: `index.html`, the files in `public/`, and
`assets/`, every file there named with its content's hash. The one build
variable is `VITE_API_BASE_URL`, empty: the API is `/api/v1` on the same
domain (`.env.example`). Set it only for an API elsewhere, as its whole
base URL (`https://api.example.com/api/v1`), and add that origin to the
CSP's `connect-src` ([security.md](./security.md)).

## Hosting

Caddy serves `/srv/maki/web/current` ([maki-be's `deploy/Caddyfile`](../../maki-be/deploy/Caddyfile)):

- `/api/*`, `/healthz`, `/readyz`: the api;
- `/assets/*`: the hashed files, `Cache-Control: public, max-age=31536000,
  immutable`; one that isn't there is a 404, never `index.html`;
- anything else: the file, or `index.html` for a client-side route (the SPA
  fallback), `Cache-Control: no-cache`, so a new deploy shows at once;
- the security headers, which [security.md](./security.md) lists.

`/srv/maki/web` holds the releases:

```
/srv/maki/web/
  current -> releases/<commit sha>
  releases/<commit sha>/   the five newest
  manifests/<commit sha>   each release's own hashed files
  incoming/                a build on its way in
```

## The pipeline

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml), with maki-be
checked out beside this repository, as in development (`../maki-be`):

| Job | When | What |
| --- | --- | --- |
| `check` | every push and pull request | `npm run lint` (ESLint and the translations' keys), the API types against maki-be's contract (`npm run gen:api`, then no difference), the unit and screen tests, the build; on `main`, the build kept as an artifact |
| `e2e` | every push and pull request | Playwright, in its own Chromium, against maki-be's api and worker built from the checkout, on a PostgreSQL 18 service (production's version) with an Owner made for the run: the admin area, the cashier, vouchers and tables, then signing in (which resets the Owner's password) last |
| `deploy` | a push to `main`, both passing, `DEPLOY_ENABLED` `true` | through the `production` environment: the build's tarball to `incoming/`, then [`deploy/release.sh`](../deploy/release.sh) over SSH |

`release.sh` unpacks the build into `releases/<sha>`, notes its own hashed
files in `manifests/<sha>`, and brings along the running release's own
files: a tab still on the old version loads its chunks after the switch,
and as only one release's files come along, they don't pile up. Then
`current` switches to it at once. Run again for the same commit, it keeps
what it brought along. Five releases stay, so a rollback is a link:

```sh
cd /srv/maki/web
ln -sfn releases/<earlier sha> current.next && mv -Tf current.next current
```

Its settings are maki-be's ([deployment.md](../../maki-be/docs/deployment.md#github)):
the `production` environment with `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS`, the repository variable
`DEPLOY_ENABLED`, and `MAKI_BE_TOKEN` while maki-be is private.

## Before launch

- [ ] `https://<domain>/` loads, and a deep link (an outlet's page) does too.
- [ ] `curl -sI https://<domain>/` shows the headers in
      [security.md](./security.md); the browser's console shows no CSP
      violation in the admin area and the cashier.
- [ ] A hashed file answers with its year-long `Cache-Control`, `index.html`
      with `no-cache`.
