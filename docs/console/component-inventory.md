# Component inventory

The reusable pieces the console screens are assembled from. This is a contract for what each
component must handle, not a choice of framework or library. Existing class names from
`src/static/styles.css` are noted where the component already exists; **New** means the site
does not have it yet.

Every component lists: what it is for, its parts, its states, and accessibility notes. States
use the shared vocabulary (loading, empty, partial, error, plus any component-specific ones).

---

## 1. Shell and navigation

### `ConsoleShell` — **New**
- **For:** the signed-in frame (top bar + side nav + content region). See
  [wireframes §0](wireframes.md#0-console-shell).
- **Parts:** top bar, side nav, banners slot, main region, skip link.
- **States:** expanded/collapsed nav, mobile drawer open/closed, unverified email (banner),
  quota/past-due banners present.
- **A11y:** `nav` landmarks for primary and mobile nav; `aria-current="page"` on the active
  item; the drawer traps focus and closes on `Esc`; skip link reuses `.skip`.

### `TopBar` — **New**
- **For:** brand, plan badge, outward links, account menu.
- **Parts:** brand link, `PlanBadge`, docs link, `AccountMenu`.
- **States:** default, past due (badge warning), unverified.
- **A11y:** account menu is a `menu`-style disclosure with keyboard support.

### `SideNav` — **New**
- **For:** primary console navigation.
- **Parts:** nav items, outward links, API version caption.
- **States:** active item, collapsed (icons only, optional), mobile drawer.
- **A11y:** `<nav aria-label="Console">`; current item `aria-current="page"`.

### `AccountMenu` — **New**
- **For:** account-level actions.
- **Parts:** trigger (email), items: Profile, Billing, Sign out (destructive styling).
- **States:** closed, open.
- **A11y:** focus management; `Esc` closes; `aria-expanded`.

### `SettingsTabs` — **New**
- **For:** the Profile / Billing / Notifications / Account sub-navigation.
- **Parts:** links, active tab.
- **States:** active, disabled (e.g. Billing while unauthorised?).
- **A11y:** `<nav aria-label="Settings">`; `aria-current="page"`.

### `Footer` — reuse
- Public `.site-footer` pattern adapted inside the console side nav (outward links, version).

---

## 2. Layout and structure

### `PageHeader` — **New**
- **For:** title, kicker, description, page-level actions, "last updated".
- **States:** with/without actions; with/without timestamp.

### `Card` / `Panel` — reuse `.panel`
- **For:** bordered surface for a group of content.
- **Parts:** optional bar/header (`.panel-bar`), body, footer.
- **States:** default, interactive (whole card is a link), selected.

### `StatTile` — **New** (extends `.readout`)
- **For:** one number with a label, an optional delta, and an optional embedded meter.
- **Parts:** label, value (mono), context line, optional `Meter` or action.
- **States:** loading (skeleton), default, warning, exceeded.
- **A11y:** label and value are read together; a meter has an accessible name and values.

### `Meter` / `QuotaBar` — **New**
- **For:** proportion used (quota, share).
- **States:** default, warning (≥ threshold), exceeded.
- **A11y:** `role="progressbar"` (or a labelled element) with `aria-valuenow/min/max` and a
  text equivalent; never colour-only.

### `Split` / `Grid` — reuse `.split`, `.wrap`
- Responsive two-column and multi-column layouts already on the site.

### `Section` / `Band` — reuse `.section`, `.band`
- Vertical rhythm and alternating surfaces.

---

## 3. Data display

### `DataTable` — **New** (generalises `table` from the docs)
- **For:** jobs, keys, invoices, history, per-operation breakdown.
- **Parts:** caption, head, rows, cell renderers, row actions, pagination or "load more".
- **States:** loading (skeleton rows), empty, partial, error, populated, sorted.
- **Behaviour:** sortable columns (keys, invoices, history); sticky header on long lists;
  stacked-row rendering under ~720 px.
- **A11y:** real `<th>` with `scope`; caption describes the table; row actions have
  accessible names including the row's identity; sortable headers expose `aria-sort`.

### `List` / `EmptyState` — **New**
- **For:** empty states and simple lists.
- **Parts:** illustration/symbol (inline SVG), heading, body, primary action, secondary link.
- **States:** empty-new (onboarding), empty-filtered (no results), error.

### `StatusBadge` — **New**
- **For:** job status, invoice status, plan state.
- **Parts:** dot/symbol + label.
- **States:** `succeeded` (`--ok`), `running` (accent), `queued` (muted), `failed` (`--warn`),
  `revoked` (muted), `paid`, `past due` (`--warn`).
- **A11y:** text label always present; do not rely on colour or the dot.

### `KeyRow` / `SecretReveal` — **New**
- **For:** showing an API key prefix in a list and the full secret exactly once.
- **Parts:** label, monospace prefix, created/last-used, copy control, revoke action.
- **States:** active, revoked, reveal-copied, reveal-dismissed, clipboard-unavailable.
- **A11y:** the reveal is a dialog, focus moves to it, copy has a live-region confirmation.

### `CodeBlock` — reuse `.code`, `.panel-bar`, `.copy`
- **For:** base URL and curl snippets.
- **States:** copy idle / copied / failed.

### `CopyButton` — reuse `.copy`
- **For:** copy key, base URL, job id.
- **States:** idle, copied, unavailable.
- **A11y:** `aria-live` confirmation; works by keyboard.

### `Prose` — reuse
- Documentation-style body text for help notes inside the console.

---

## 4. Charts

No charting vendor is proposed (see [open questions](open-questions.md#charts)). The charts
needed are small, so inline SVG is sufficient.

### `UsageChart` — **New**
- **For:** jobs per day/bucket over the current period.
- **Parts:** plot area (`--panel-deep`), bars or line, axis labels, hover/focus readout.
- **States:** loading, empty, populated, single-point, large-range.
- **A11y:** `role="img"` with a summarizing `aria-label`, plus the adjacent `DataTable` as the
  text equivalent; hover values also reachable by keyboard focus.

### `OperationBreakdown` — **New**
- **For:** share of jobs by operation.
- **Parts:** rows of label + `Meter` + count/share, or a small bar list.
- **States:** loading, empty, populated, "other" bucket.
- **A11y:** each row is text, not a graphic; the same data is in a `DataTable`.

### `HistoryTable` — `DataTable` variant
- 12 periods of counts, limits and status.

---

## 5. Forms and inputs

### `TextInput` / `PasswordInput` — **New** (styled per `--line-strong`, focus per site)
- **States:** default, focused, filled, disabled, invalid (+ message), success.
- **A11y:** visible `<label>`; helper and error text linked via `aria-describedby`; error
  announced; password field offers show/hide.

### `Checkbox` / `Toggle` — **New**
- **For:** terms, notification preferences.
- **States:** checked, unchecked, indeterminate (none needed), disabled.
- **A11y:** native control or full keyboard/ARIA parity; label clickable.

### `FormField` — **New**
- Wraps label + control + helper + error, so spacing and error placement are consistent.

### `FormActions` — **New**
- Primary + secondary buttons with consistent order, busy state and keyboard submit.

### `Select` — **New**
- **For:** usage period picker.
- **States:** default, open, disabled.

### `InlineValidation`
- Field-level error/success rendered by `FormField`.

---

## 6. Feedback and overlays

### `Alert` / `Banner` — **New**
- **For:** quota warnings, past-due, email verification, inline errors.
- **Parts:** symbol, message, action(s), dismiss (when dismissible).
- **States:** info, warning, error, success; sticky (top of console) vs inline.
- **A11y:** `role="status"` or `role="alert"` appropriately; not used for anything that
  requires immediate focus.

### `Dialog` / `Modal` — **New**
- **For:** create key, reveal key, revoke confirm, delete account, re-auth.
- **Parts:** title, body, actions, close.
- **States:** open, closing, busy (submit in progress), error.
- **A11y:** focus trap, `Esc` to close (except destructive in-progress), `aria-modal`,
  labelled by the title; return focus to the trigger.

### `Toast` / `InlineNotice` — **New**
- **For:** "Copied", "Saved", "Key revoked".
- **States:** success, error; auto-dismiss for non-essential, persistent for errors.
- **A11y:** `aria-live="polite"`.

### `ConfirmDestructive` — **New**
- **For:** revoke key, delete account, downgrade.
- **Parts:** consequence copy, typed confirmation (when required), confirm/cancel.
- **States:** idle, mismatch, busy.
- **A11y:** destructive button labelled with the verb and object ("Revoke key"), not "OK".

### `Skeleton` — **New**
- Matches the shape of the loading content.

### `ErrorState` — **New**
- Region-level message + retry.

### `Spinner` — reuse/reserve
- Only for first paint and button busy states.

---

## 7. Buttons and actions

### `Button` — reuse `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.btn-lg`
- **Variants needed beyond today:** `btn-danger` (destructive), `btn-quiet` (tertiary/link-
  style inside rows).
- **States:** default, hover, focus, active, disabled, busy (label + spinner, keeps width).

### `IconButton`
- Row actions (copy, revoke, external link) with an accessible name via `aria-label`.

### `ExternalLink`
- Adds an outward affordance and `rel="noopener"` where relevant; used for docs, status,
  checkout, portal, invoices.

### `Pagination` / `LoadMore`
- For the jobs table and long history; "load more" is preferred for scanning.

---

## 8. Auth-specific

### `AuthCard` — **New**
- Centered card used by login, register, forgot, reset, verify.
- **Parts:** brand mark, title, subcopy, form slot, footer links.

### `AuthForm` — **New**
- Shared error region, submit state, generic-error handling (no account enumeration).

### `PasswordStrengthHint`
- Guidance line under the password field.

### `ReauthPrompt` — **New**
- Modal used when a session expires mid-action (flow F3).

---

## 9. Billing-specific

### `PlanCard` — extends `.pricing-card`
- **Parts:** name, price, period, feature list, current marker, CTA (`Upgrade`, `Current`,
  `Contact`), delta line.
- **States:** current, available, featured, past due, enterprise/contact.

### `PlanBadge`
- Compact plan name for the top bar; warning styling when past due.

### `CheckoutButton`
- Starts the hosted checkout; busy state; handles return.

### `InvoiceList` — `DataTable` variant
- Date, amount, status, link to the hosted invoice.

### `BillingSummary`
- Plan, renewal/reset date, payment method summary, portal link.

### `UsageLimitNotice`
- Maps quota/overage state to copy on dashboard, usage and plan.

---

## 10. Cross-cutting requirements

- **Tokens only.** Components use the variables in
  [the token map](README.md#design-foundation); no hard-coded colours outside it.
- **Every list/tile/chart has loading, empty, error and populated states.**
- **Copy is generic.** No client names, no real data; examples use `you@example.com`,
  `ak_live_…`, `a1b2c3d4`.
- **Mono for machine strings:** keys, ids, numbers, timestamps, code — `--mono`.
- **Mono weight pairing** stays at 400/500 as the site already loads it.
- **Motion** is minimal and respects `prefers-reduced-motion`.
- **No vendor requirement.** Everything above is achievable with the current stack; charts
  and illustrations are inline SVG.
