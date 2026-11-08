# Information architecture and sitemap

## 1. Two shells, one brand

The product has two audiences with different needs, so it has two shells that share tokens:

- **Public shell** — what exists today: `site` (marketing) and `docs` layouts in
  `scripts/build.mjs`. Optimised for reading and for getting an API key.
- **Console shell** — new: the signed-in app. Optimised for repeated, dense, data-first use.
  Adds a persistent side navigation and a top bar, and drops the marketing hero.

A visitor crosses from one to the other at sign-in and back at sign-out. The public header's button
is "Sign in" and points at the console's login screen (`https://console.audiokit.ai/login`, built
from `site.config.mjs`); the console's account menu links back to the docs and the marketing site.

## 2. Sitemap

Working assumption is a `/console` prefix on `audiokit.ai`. If the console turns out to be a
separate app or subdomain, only the prefix changes — the tree below stands
([open question](open-questions.md#app-shape-and-hosting)).

```
/                                   public: landing
/pricing/                           public: plans and FAQ
/docs/                              public: getting started
/docs/reference/                    public: API reference
/docs/mcp/                          public: MCP

/login                              auth: sign in
/register                           auth: create account
/forgot-password                    auth: request a reset link
/reset-password                     auth: set a new password (token in link)
/verify-email                       auth: confirm email address

/console/                           dashboard
/console/usage                      usage detail
/console/api-keys                   API keys
/console/plan                       current plan and upgrade (signed-in pricing)
/console/settings/                  settings root → redirects to profile
/console/settings/profile           name, email, password
/console/settings/billing           plan, payment method, invoices → Stripe portal
/console/settings/notifications     email preferences
/console/settings/account           sign out, delete account (danger zone)

/console/upgrade/success            return from checkout (confirmation)
/console/upgrade/cancelled          return from checkout (no charge)
/console/billing/return             return from the Stripe billing portal
```

Notes:

- **`/console/plan`, not `/console/pricing`.** The public page sells; the signed-in page manages
  a plan. Keeping them apart avoids a route collision and lets each page say the right thing.
  The public `/pricing/` gets a "current plan" marker only for signed-in visitors.
- **Settings is a section, not a single page.** Profile, billing, notifications and the danger
  zone have different risk levels; splitting them keeps destructive controls away from the
  everyday ones.
- **Upgrade return URLs are their own routes** so a checkout can land somewhere truthful
  ("you're on Pro") rather than dropping the user on a generic dashboard.

## 3. Console shell anatomy

```
┌──────────────────────────────────────────────────────────────────────────┐
│ top bar: [brand]        [plan badge]              [docs ↗] [account ▾]    │
├───────────────┬──────────────────────────────────────────────────────────┤
│ side nav      │  page header: title + kicker + page actions              │
│  Dashboard    │  ────────────────────────────────────────────────────────│
│  Usage        │                                                          │
│  API keys     │  page body                                               │
│  Plan         │                                                          │
│  Settings     │                                                          │
│               │                                                          │
│  ── footer ── │                                                          │
│  Docs ↗       │                                                          │
│  Status ↗     │                                                          │
└───────────────┴──────────────────────────────────────────────────────────┘
```

- **Top bar** is persistent. Left: brand (links to the public site). Right: the current plan
  as a badge, a link to the docs, and an account menu (email, settings, sign out).
- **Side nav** is the console's primary navigation: Dashboard, Usage, API keys, Plan,
  Settings. It shows the active item with the accent bar. On small screens it collapses to a
  top bar plus a drawer.
- **Footer** of the side nav holds outward links (docs, status) and the API version, mirroring
  the public footer.
- The **quota banner** and the **payment banner** live between the top bar and the page body,
  so they are visible on every screen while they apply.

## 4. Navigation hierarchy

| Level | Surfaces |
| --- | --- |
| Primary (side nav) | Dashboard · Usage · API keys · Plan · Settings |
| Secondary (in-page tabs) | Settings → Profile / Billing / Notifications / Account |
| Contextual | Empty-state buttons, quota banners, "Upgrade" CTAs, row actions, account menu |
| Outbound | Docs, API reference, Status, Marketing site, Sign out |

Rules:

- **One primary action per screen**, marked `▸` in [wireframes](wireframes.md).
- Primary nav never contains an action that navigates away from the console, except the
  account menu's sign out and the outward footer links.
- Deep links are preserved through sign-in: an unauthenticated hit on `/console/usage` sends
  the user to `/login` and returns them to `/console/usage` after auth.

## 5. Content hierarchy per screen

Each screen has one job. Primary content first, supporting detail second.

| Screen | Primary | Secondary | Supporting |
| --- | --- | --- | --- |
| Login / register | The form | Why sign up / what you get | Links to docs, terms |
| Dashboard | Quota status and this month's jobs | Recent jobs table | Quick-start (API key, docs) |
| Usage | Usage over the current period | Per-operation breakdown | 12-month history, quota warnings |
| API keys | Key list and state | Create key | Usage hint (last used), security copy |
| Plan | Current plan | Upgrade options | Invoices / billing link |
| Settings · profile | Name and email | Password change | Session / sign out |
| Settings · billing | Plan and payment method | Invoices | Portal link, past-due handling |
| Settings · notifications | Email preferences | — | What we send and when |
| Settings · account | Sign out | Delete account | Consequences of deletion |

## 6. Screen states

Every screen must define these, because most console bugs are missing states, not missing
features.

- **Loading** — skeleton in the shape of the final content; never a full-page spinner after
  first paint.
- **Empty (new account)** — explain the next step and link to it, e.g. "No jobs yet. Create an
  API key, then submit your first job."
- **Empty (no results)** — for filters/windows with no data; distinguish from new account.
- **Partial / degraded** — e.g. usage present but the 12-month history still loading. Show
  what is ready.
- **Error** — inline where the failure is, with a retry; a page-level error only when nothing
  can render.
- **Unauthenticated** — redirect to login, preserving the deep link.
- **Expired session** — modal or inline re-auth, then resume; do not dump typed form data.
- **Quota exceeded** — banner + disabled job submission messaging; upgrade CTA.
- **Past due** — payment banner, plan badge turns to a warning state, grace-period copy.
- **Canceled / downgraded at period end** — "Pro until <date>", then reverts.

## 7. Data each screen needs

Stated as information, not as an API design; the backend shape is EPSILON-42's to decide.
Sources that exist in the draft plan/backend or the public contract are noted.

| Screen | Needs |
| --- | --- |
| Login / register | account create/authenticate; email-verification send |
| Dashboard | current-period job count, quota limit and remaining, plan name, last N jobs (id, operation, status, created), per-job links |
| Usage | job counts bucketed by day/week for the current period, breakdown by `operation`, counts for the last 12 periods, quota limit per period |
| API keys | list of keys (label, created, last used, prefix), create, revoke; the full key once at creation |
| Plan | plan name, price, period anchor, renewal date, limits; Checkout session; Stripe portal session |
| Settings · profile | name, email, verification state; password change |
| Settings · billing | plan, payment method summary, invoices; portal session |
| Settings · notifications | preference flags |
| Settings · account | delete-account request; sign out |
| Upgrade return | checkout result and the resulting plan |

Operations that can appear in a per-operation breakdown come from the public contract's
`Operation` enum: `probe`, `loudness`, `waveform`, `transcode`, `preview`, `tempo`, `key`,
`fingerprint`, `analyze`, `tags`.

## 8. Entry points into the console

| From | To | Trigger |
| --- | --- | --- |
| Public header | `/login` | "Sign in" |
| Landing hero and closing band | `/login` | "Sign in to the console" |
| Public pricing (Free, Pro) | `/login` | "Sign in" |
| Public pricing (Enterprise, FAQ contact) | `mailto:sales@audiokit.ai` | "Contact sales" |
| Docs "an API key" | `/login`, then `/api-keys` | contextual CTA |
| Quota-warning email | `/console/plan` | email CTA |
| Receipt / payment email | `/console/settings/billing` | email CTA |
| Direct link | any `/console/*` | redirect via `/login`, preserving target |

The landing page's early-access form is gone: a visitor who has never been provisioned has no
self-serve way to get an account, because the console has no register screen and a magic link is
only sent for an address that already exists.

## 9. Accessibility and layout floor

- Keyboard reachable throughout; visible focus ring reuses the existing `:focus-visible`
  accent outline.
- Side nav is a `nav` landmark; the current page carries `aria-current="page"`, matching the
  public header's convention.
- Tables use real headers and a caption; charts have a text/table equivalent.
- Contrast is checked against the dark tokens above; `--faint` is for non-essential text only.
- The layout works from 360 px up; dense tables become stacked rows on narrow screens, the
  same pattern the docs field tables already use.
