# Security

What maki-fe does about security, and the headers it is served with. The
workspace standard is React + Vite §9; the backend's side is
[maki-be's security.md](../../maki-be/docs/security.md).

## Headers, as deployed

Caddy serves the app, so its headers are set there:
[maki-be's `deploy/Caddyfile`](../../maki-be/deploy/Caddyfile), on every
response of the domain, the API's included.

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | below |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (no `preload`) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Server` | removed |

The CSP, the standard's baseline with one addition:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <CDN_ORIGIN> <STORAGE_ORIGIN>; font-src 'self';
connect-src 'self' <STORAGE_ORIGIN>; worker-src 'self'; manifest-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';
upgrade-insecure-requests
```

- `script-src 'self'`: the production build emits only script files, and
  `index.html` has no inline script. Keep it so.
- `style-src` takes `'unsafe-inline'`, which the standard allows when a
  library injects `<style>` elements at runtime: **Radix's Dialog** does,
  through `react-remove-scroll-bar` (`react-style-singleton`), to lock the
  page's scroll while a dialog is open. Every dialog here is one. A static
  build can't carry a per-response nonce for it. The build itself links its
  CSS, and the styles set from script (React's `style` prop, Radix's
  positioning) go through the CSSOM, which the CSP doesn't block anyway.
  Scripts stay `'self'` only.
- `font-src 'self'`: Plus Jakarta Sans ships with the app (Fontsource).
- `connect-src 'self'`: the API is on the same domain, and `'self'` covers
  its WebSocket too.
- `CDN_ORIGIN` and `STORAGE_ORIGIN` (maki-be's `.env`) are empty until menu
  photos come: then the CDN in front of the public bucket, and the object
  storage that private files and uploads go to (Go + Gin standard §9).

Check them on the live domain: `curl -sI https://<domain>/`, and the
browser's console shows no CSP violation on the admin area and the cashier.

## Tokens and cookies

- The **access token** lives in memory only (`shared/lib/session.ts`): a
  reload starts with a refresh.
- The **refresh token** is the backend's cookie `maki_refresh`: `HttpOnly`,
  `Secure` outside development, `SameSite=Strict`, sent to the refresh and
  sign-out paths only. No script reads it.
- A browser that is a cashier device holds the backend's `maki_device`
  cookie, with the same flags. It says which device sells, apart from who is
  signed in on it.
- Nothing of a session is in `localStorage`; it keeps only the language
  chosen before signing in.

## Build-time configuration

Anything `VITE_` is inlined into the bundle and public. `.env.example` has
only `VITE_API_ORIGIN`, empty in production (the same domain). No secret
ever goes behind `VITE_`.

## Errors

The route error screen says what happened in words, with the request ID
when the API gave one: never the error itself or a stack trace.
