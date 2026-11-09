# AudioKit console

The signed-in customer console: dashboard, usage, API keys, plan and settings. This is the app
the public site's "Console" direction advertises. Every screen is built from the committed
design behind a typed client. It runs against the real billing service when
`PUBLIC_BILLING_API_URL` is set, and against in-memory fixtures otherwise, so local dev, tests
and the build need no service.

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

| Route               | Screen                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `/login`            | Email magic-link sign-in                                         |
| `/signup`           | Email magic-link sign-up: Free plan, no password, no card        |
| `/auth/callback`    | Magic-link landing point; for a new account, shows its first key |
| `/onboarding`       | First-run setup: profile, save the key, try a request            |
| `/dashboard`        | Usage overview, recent jobs, quick start                         |
| `/usage`            | Chart, per-operation breakdown, 12-period history                |
| `/api-keys`         | List, create (reveal once), revoke                               |
| `/settings`         | Profile, notifications, session, danger zone                     |
| `/settings/billing` | Plan, payment summary, invoices                                  |
| `/pricing`          | Signed-in plan and upgrade                                       |
| `/logout`           | `POST`: clears the session and returns to `/login`               |

`/` redirects to `/dashboard` (or `/login` when signed out). Everything under the console
shell requires a session; the deep link is preserved through sign-in (`/login?next=…`) and
validated with `safeNext()` so it can't become an open redirect.

## Auth

Auth is **email magic link through the billing service**, per decision 0016:

1. `/login` posts an email to `api.requestMagicLink()`.
2. The service emails a single-use link to `/auth/callback?token=…` (in mock mode the link is
   shown on the sign-in screen instead, so the flow can be walked without an inbox).
3. `/auth/callback` calls `api.exchangeMagicLink(token)` and sets the `ak_console_session`
   cookie (httpOnly, `sameSite=lax`, short-lived).
4. `hooks.server.ts` resolves the cookie into `locals.session` and keeps the raw token on
   `locals.sessionToken`; the console layout redirects signed-out requests to `/login?next=…`.
   Server loads then call `apiFor(locals.sessionToken)`, which sends the token as a bearer.

**Sign-in and sign-up are the same link.** `/signup` posts to the billing service's `POST
/v1/auth/signup` and `/login` to `POST /v1/auth/magic-link`; both get a pending token for an
address with no account, and opening it creates that account — Free plan, email already verified
by the click, no password (billing decision 0033). The exchange then answers
`{ user, token, created, api_key }`; on `created` the callback stays put and renders `Welcome.svelte`
with the one-time key, because the service keeps only its hash. A returning account is redirected
to its `next` target instead.

**First-touch signup source** (AudioKit decisions 0040 and 0041). On the page a visitor lands
on, the public site reads the source in memory, storing nothing on the device
(`src/static/first-touch.js`), and adds it to that page's console sign-up and sign-in links as `ak_ref` (referring host only), `utm_*`
and `ak_landing` (path only). `/signup` and `/login` read those values (or, for a direct landing,
`utm_*` and the `Referer` host), carry them in hidden fields and send them with the link request,
because a sign-in link also creates the account for a new address. The console stores none of it.
`src/lib/signup-source.ts` cleans and caps the values; `toWireSignupSource` is the only place that
knows the billing field names.

In mock mode the token is `mock.<email>`. In HTTP mode it is the service's JWT: `apiFor` passes
it to every authenticated call and the service verifies it; `parseSessionToken` only decodes it
so the shell can resolve the session.

## Data

`src/lib/api-client.ts` is the only boundary between screens and the billing/accounts service.
It exports:

- a `ConsoleApi` type (account, plans, jobs, usage, keys, billing, preferences, checkout, auth);
- `createApiClient()`, which selects the adapter (see **Billing API** below);
- `apiFor(sessionToken)`, the signed-in client the server routes use;
- `api`, the adapter for the unauthenticated auth flow.

Fixtures are static, deterministic and generic (`you@example.com`, `ak_live_…`, `a1b2c3d4`) in
`src/lib/fixtures.ts`. No client names and no real customer data.

The mock adapter keeps mutations (created/revoked keys, profile edits, plan changes) in module
memory. They survive navigation in `vite dev` and in a single long-lived server, but reset on a
cold start. That is deliberate for a scaffold: there is no database behind it.

## Billing API

`PUBLIC_BILLING_API_URL` is the billing service root, without a trailing `/v1` (for example
`https://billing.audiokit.ai`). When it is set, `api-client.ts` uses the HTTP adapter in
`src/lib/http-adapter.ts`; when it is unset (local dev, tests, the build) the mock adapter in
`src/lib/mock-adapter.ts` is the default. Set it in the console Netlify site's environment
(Netlify UI or `netlify.toml`); never commit it. See `console/.env.example`.

`src/lib/http-adapter.ts` maps `ConsoleApi` onto the service's real routes (`src/routes/` in
`epsilon-records/audiokit-billing`): `/v1/auth/me`, `/v1/subscriptions/current`,
`/v1/usage/current`, `/v1/usage/history`, `/v1/api-keys` and `/v1/jobs`. Routes the service does
not have yet (the magic-link endpoints, plans, notification preferences, profile update and
checkout) are documented as `ASSUMED` at the top of the file and tracked on the knowledge board;
the service's wire format is snake_case and the adapter translates it to the console's types.

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

- Auth: session lifetime, email-change re-verification, rate limiting.
- API keys: real key format, scoping/expiry, per-account limits, "last used" semantics.
- Usage: what counts as a job vs an operation, billing-period anchor, retention, timezone. The
  HTTP adapter has no per-day data yet, so the daily chart is empty until the service exposes it.
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
    api-client.ts        typed client boundary and adapter selection
    http-adapter.ts      the real billing-service client (selected by env)
    mock-adapter.ts      in-memory mock implementation (the default)
    errors.ts            the shared ApiError base
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

## First-party dashboard performance pilot (EPSILON-107)

Default disabled. The browser flag `PUBLIC_APP_METRICS_ENABLED=true` takes effect only
for a production-context build on `console.audiokit.ai`. `APP_METRICS_ENABLED=true`
separately enables the relay; billing has its own identically named sink switch.
`APP_METRICS_SECRET` is a dedicated 32–128 character server-only machine credential
configured on this site and billing. Never expose it through PUBLIC/VITE variables
or reuse a session JWT, API key or general billing service token. Deploy and review
billing first; do not enable the console until its database/machine configuration
and browser proof have been reviewed.

Only framework route ID `/(console)/dashboard` maps to the wire symbol `dashboard`.
The collector emits `document_mount_ms` at initial client mount, from numeric
`performance.now()`. This is not load completion, paint, a Web Vital, visits or an
authentication timer. All client navigations and all other routes are excluded in
this one-route slice. The collector reads no URL, referrer, entry name, form,
cookie or storage, and emits only `{v:1,route:'dashboard',metric,ms}` with integer
milliseconds 0–60000. The shared contract reserves `client_navigation_ms`, but this
pilot never produces it.

Native browser fetch uses a fixed same-origin `/api/app-metrics` endpoint, omitted
credentials, no referrer, redirect errors, no-store, no keepalive and a one-second
abort. It never retries, flushes on hide/unload or blocks navigation. The exact
hook bypasses cookie/session decoding. Only matching adapter-owned Netlify site
context permits discarding W3C/AWS/Netlify transport tracing; credential and baggage
rejection remains intact. The auth callback's existing origin referrer policy is
unchanged.

The relay validates strict JSON (including duplicate keys), same-origin metadata,
256 actual streamed bytes and a one-second body deadline. Its instance-global
bucket permits burst five/30 attempts per minute and two concurrent calls. It
reconstructs the four fields and forwards only JSON Content-Type and the dedicated
machine Authorization to `https://billing.audiokit.ai/v1/internal/app-metrics`.
The internal hop has a one-second deadline and no retry. It forwards no browser
headers, session, attribution or raw body. Hosts inevitably receive network
metadata; this makes no claim that addresses are never received or provider logs
are erased.

Billing owns migration `0012_console_performance_aggregates.sql`, execute-only
roles, an atomic global 2000/day budget and finite daily histograms, with startup
and daily 00:10 UTC pruning even while ingestion is off. Current UTC day plus
previous seven days is a technical default, not a newly asserted Nate-explicit
retention choice. There are no event rows, user identifiers or tenant read API.
Readback is controlled operator SQL; no dashboard, funnel or weekly report is added.
Deletion does not erase existing backups/WAL. See billing README for SQL and rollout.

`tests/fixtures/app-metrics-v1.json` adapts ERMS contract v1 (main `5f4e802`) only by
selecting the approved dashboard route. Billing uses the same fixture bytes, with
no shared runtime package/new dependency. The billing PR's Node CDP harness runs
an installed Chrome against the actual console app, endpoint, relay, actual private
sink and PostgreSQL 18; it independently inspects both network hops. It covers TLS
Secure fake cookies, physical hiding, auth callbacks, history, failures and disabled
collection. Genuine BFCache is additionally tested with the actual collector bundle
in a minimal fixture; this is not whole deployed-app BFCache proof.
