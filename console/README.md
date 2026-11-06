# AudioKit console

The signed-in customer console: dashboard, usage, API keys, plan and settings. This is the app
the public site's "Console" direction advertises. It is a **scaffold**: every screen is built
from the committed design, but all data is static fixtures behind a typed client and nothing
talks to a backend yet.

- Design source: [`docs/console/`](../docs/console/) (PR #9, `akw-console-design`).
- Stack decision: AudioKit
  [0016](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0016-console-sveltekit.md)
  — SvelteKit + Svelte 5, TypeScript, Vite, its own Netlify site.
- Supersedes the closed Next.js scaffold (PR #10): those files are not carried forward.

## Stack and location

- **Location:** `console/` in this repo, a sibling app to the static site in `src/`. The
  website build (`npm run build` at the repo root) does not touch it, and this app's build does
  not touch the site. They deploy as two Netlify sites.
- **Stack:** SvelteKit 3 + Svelte 5 (runes) + TypeScript + Vite, with
  [`@sveltejs/adapter-netlify`](https://svelte.dev/docs/kit/adapter-netlify). No UI or CSS
  framework.
- **Styling:** plain CSS in `src/app.css`, built on the site's CSS custom-property tokens copied
  verbatim from `src/static/styles.css` (direction A, "Console"). No Tailwind. When the site's
  tokens change, update both blocks.
- **Independent of ERMS:** no shared components, no shared theme, no runtime dependency on
  another app.
- **Not decided here:** the billing service's HTTP API, session lifetime, and billing vendor
  details. Those are open questions in the design and decisions in the knowledge repo; the
  client boundary and `TODO(EPSILON-46)` comments mark where they land.

## Routes

| Route               | Screen                                                      |
| ------------------- | ----------------------------------------------------------- |
| `/login`            | Email magic-link sign-in                                    |
| `/auth/callback`    | Magic-link landing point (sets the session, then redirects) |
| `/dashboard`        | Usage overview, recent jobs, quick start                    |
| `/usage`            | Chart, per-operation breakdown, 12-period history           |
| `/api-keys`         | List, create (reveal once), revoke                          |
| `/settings`         | Profile, notifications, session, danger zone                |
| `/settings/billing` | Plan, payment summary, invoices                             |
| `/pricing`          | Signed-in plan and upgrade                                  |
| `/logout`           | `POST`: clears the session and returns to `/login`          |

`/` redirects to `/dashboard` (or `/login` when signed out). Everything under the console
shell requires a session; the deep link is preserved through sign-in (`/login?next=…`) and
validated with `safeNext()` so it can't become an open redirect.

## Auth (mock-first)

Auth is **email magic link through the billing service**, per decision 0016:

1. `/login` posts an email to `api.requestMagicLink()`.
2. The service would email a single-use link to `/auth/callback?token=…`.
3. `/auth/callback` calls `api.exchangeMagicLink(token)` and sets the `ak_console_session`
   cookie (httpOnly, `sameSite=lax`, short-lived).
4. `hooks.server.ts` resolves the cookie into `locals.session`; the console layout redirects
   signed-out requests to `/login?next=…`.

In mock mode the link is **shown on the sign-in screen** instead of being emailed, so the flow
can be walked without an inbox or a live service. The session token format is mock-specific
(`mock.<email>`); a real adapter will treat it as opaque and verify it with the service.

## Data

`src/lib/api-client.ts` is the only boundary between screens and the billing/accounts service.
It exports:

- a `ConsoleApi` type (account, plans, jobs, usage, keys, billing, preferences, checkout, auth);
- `createApiClient()`, which currently returns the mock adapter from
  `src/lib/mock-adapter.ts`;
- `api`, the app's instance.

Fixtures are static, deterministic and generic (`you@example.com`, `ak_live_…`, `a1b2c3d4`) in
`src/lib/fixtures.ts`. No client names and no real customer data.

The mock adapter keeps mutations (created/revoked keys, profile edits, plan changes) in module
memory. They survive navigation in `vite dev` and in a single long-lived server, but reset on a
cold start. That is deliberate for a scaffold: there is no database behind it.

## Develop

```bash
cd console
npm ci
npm run dev        # Vite dev server, usually http://localhost:5173
npm run build      # production build; writes build/ and .netlify/functions-internal/
npm run check      # svelte-check (type + template diagnostics)
npm test           # Vitest unit tests for the client, fixtures, formatters and session helper
npm run lint       # Prettier check
npm run format     # Prettier write
```

Node 22 or newer.

## Deploy

The console is its **own Netlify site**, separate from the static site:

- Site base directory: `console`.
- Build command: `npm run build` (from `console/netlify.toml`).
- Publish directory: `build` (the adapter's default; set explicitly in `vite.config.ts` and
  `netlify.toml`).
- The server-side routes run as the adapter's Netlify Function; `static/` assets are served
  from `build/`.

## CI

`.github/workflows/console.yml` is path-filtered to `console/**`. It installs with `npm ci`,
then runs `npm run check`, `npm run build` and `npm test`. It is independent of the site build
and does not run when only `src/`, `scripts/` or `contract/` change.

## What is deliberately not done

These are the design's open questions, left as TODOs rather than guessed:

- Auth: real service calls, session lifetime, email-change re-verification, rate limiting.
- API keys: real key format, scoping/expiry, per-account limits, "last used" semantics.
- Usage: what counts as a job vs an operation, billing-period anchor, retention, timezone.
- Billing: Stripe approval, portal session, overage, dunning/grace, cancellation ownership,
  downgrade timing. The portal button is disabled until `portalUrl` exists.
- Data retention: delete-account semantics and export (button disabled).
- Charts: interactivity beyond hover/focus (inline SVG only).
- Status page, legal pages, i18n and accessibility-target confirmation.
- Real loading/error/partial states: the components for empty states and notices exist, but the
  mock client never fails. A full mobile-drawer focus trap is also still to do.

## Layout

```
src/
  app.css                tokens (copied from src/static/styles.css) + console styles
  app.html               fonts, metadata shell
  hooks.server.ts        session resolution + security headers
  lib/
    api-client.ts        typed client boundary (mock adapter today)
    mock-adapter.ts      in-memory mock implementation
    fixtures.ts          static, generic demo data
    types.ts             account, plan, usage, keys, billing, auth types
    format.ts            dates, numbers, percentages, relative time
    session.ts           cookie name, lifetime, safeNext() open-redirect guard
    components/          shell, nav, dialogs, tables, meters, chart, plan cards
  routes/
    login/               magic-link request
    auth/callback/       magic-link consumption
    (console)/           guarded shell: dashboard, usage, api-keys, settings, pricing
    logout/              POST sign-out
tests/                   Vitest unit tests
```
