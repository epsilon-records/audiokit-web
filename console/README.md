# AudioKit console

The signed-in customer console: dashboard, usage, API keys, plan and settings. This is the
app the public site's "Console" direction advertises. It is a **scaffold**: every screen is
built from the committed design, but all data is static mock data and nothing talks to a
backend yet.

Design source: [`docs/console/`](../docs/console/) (PR #9, `akw-console-design`). The design
is the contract for routes, states and components; this app implements the shells and the
happy path, and leaves the open questions as `TODO(EPSILON-46)` comments.

## Stack and location

- **Location:** `console/` in this repo, a sibling app to the static site in `src/`. The
  website build (`npm run build` at the repo root) does not touch it, and this app's build
  does not touch the site. That keeps the two deploy pipelines separate, which knowledge
  decision [0014](../../../knowledge/audiokit/decisions/0014-freemium-billing-service.md)
  requires for the billing service and which the design's open question on app shape leaves
  open.
- **Stack:** Next.js (App Router) + React + TypeScript, no UI or CSS framework. Plain CSS in
  `app/globals.css` reuses the site's tokens and type verbatim, so the console and the
  marketing site share one visual language. Charts are inline SVG; there is no charting
  vendor.
- **Why Next.js:** the plan suggested it, it gives file-based routes for the IA's tree,
  server components for the shell, and a path to auth/session handling without adding a
  second framework later. Nothing in the design depends on it; the components are plain
  React and would move to another React framework with little change.
- **Not decided here:** hosting, auth/session model, and the billing service's HTTP API.
  Those are open questions in the design and decisions in the knowledge repo. This app
  deliberately does not record a new decision.

## Routes

| Route | Screen |
| --- | --- |
| `/login` | Sign in |
| `/register` | Create account |
| `/forgot-password` | Request a reset link |
| `/reset-password` | Set a new password |
| `/verify-email` | Check your inbox / resend |
| `/console` | Dashboard |
| `/console/usage` | Usage detail |
| `/console/api-keys` | API keys (create, reveal once, revoke) |
| `/console/plan` | Signed-in plan and upgrade |
| `/console/settings/profile` | Profile and password |
| `/console/settings/billing` | Plan, payment, invoices |
| `/console/settings/notifications` | Email preferences |
| `/console/settings/account` | Sign out, delete account |
| `/console/upgrade/success` | Checkout return (success / processing) |
| `/console/upgrade/cancelled` | Checkout return (no charge) |
| `/console/billing/return` | Billing-portal return |

`/` redirects to `/console`; `/console/settings` redirects to the profile tab. The design
proposes a `/console` prefix on `audiokit.ai`; the routes here keep that prefix so the tree
survives a move to a subdomain.

## Data

`lib/api-client.ts` is the only boundary between screens and the billing/accounts service.
It exports a `ConsoleClient` type and a mock implementation backed by `lib/mock-data.ts`.
When the service lands, replace the mock implementation with HTTP calls and keep the type;
screens do not change.

Mock data is deterministic and generic: `you@example.com`, `ak_live_…`, `a1b2c3d4`. No
client names, no real customer data.

## Develop

```bash
cd console
npm ci
npm run dev        # http://localhost:3000
npm run build      # production build; must pass
npm run typecheck  # tsc --noEmit
```

Node 20.9 or newer.

## What is deliberately not done

These are the design's open questions, left as TODOs rather than guessed:

- Auth: session vs token, email-verification requirement, password rules, MFA, session
  lifetime. Forms submit to a stub that says so.
- API keys: real format, scoping, expiry, per-account limit, "last used" semantics.
- Usage: what counts as a job vs an operation, billing-period anchor, retention, timezone.
- Billing: Stripe approval, overage, dunning/grace, cancellation ownership, downgrade timing.
- Data retention: delete-account semantics, export.
- Charts: interactivity beyond hover/focus (MVP uses inline SVG).
- Status page, legal pages, i18n, accessibility target confirmation.

Also not done: real loading/error/partial states (the components exist, the mock client never
fails), a full focus trap in `Dialog`, and any analytics.

## Layout

```
app/
  layout.tsx            fonts, metadata, globals.css
  page.tsx              redirect to /console
  (auth)/               login, register, forgot, reset, verify
  console/              shell layout + dashboard, usage, api-keys, plan, settings, returns
components/             shell, nav, tables, meters, dialogs, auth card, plan card, chart
lib/                    types, mock data, typed client stub, formatting
```
