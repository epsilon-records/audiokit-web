# Open questions for Nate

This design is deliberately silent on anything that would commit to a stack, a vendor, or a
policy. Each item below is a decision, not an assumption, and is left for Nate (or for the
relevant Linear ticket). Each one is formatted as: the question, why it blocks or shapes the
design, and the current best default if we had to ship without an answer.

## App shape and hosting

- **Is the console a separate app or part of `audiokit-web`?** The plan's draft assumes a
  separate React/Next app; [audiokit 0006](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0006-website-in-separate-repo.md)
  says `audiokit-web` is the website + docs, and the architecture ticket
  ([EPSILON-42](https://linear.app/epsilon-records/issue/EPSILON-42)) is undecided. It shapes
  routing, auth, session storage, deploy, and whether the current static build needs to do
  anything new.
  *Design default:* `/console/*` on `audiokit.ai`, built as part of this repo, so the tree in
  the [IA doc](information-architecture.md) holds. No framework chosen.
- **What host do checkout and billing-portal return URLs use?** They must be stable and
  environment-aware.
  *Default:* the console origin plus the return routes above.
- **Is the admin/operations interface (Phase 3) in scope for the same shell?** Not designed
  here.

## Auth

- **Session vs token auth for the browser?** Cookie sessions and bearer tokens have different
  CSRF and expiry behaviour, and change the re-auth flow (F3).
- **Is email verification required before API keys work, or a nudge?** Affects onboarding
  friction and the critical path (F1).
- **Password rules and MFA/SSO.** The register copy assumes a length rule.
  *Default:* a single length-based rule; no MFA in MVP.
- **Do we support support-impersonation or login-as?** Out of scope here; flag for admin.

## Sessions

- **Does a password change or reset sign out other sessions?** Affects F4 and F3.
- **Session lifetime and idle timeout.** Drives whether the re-auth prompt is common.
  *Default:* password reset invalidates all sessions; document it.

## Legal

- **Terms/privacy/acceptable-use pages.** Register references a checkbox; none of these pages
  exist on the site today. Needed before collecting accounts.
- **Cookie/consent posture for the console and analytics.** No analytics vendor chosen.

## API keys

- **Key prefix and format.** Wireframes show `ak_live_…`; the real format is the API's call.
- **Scoping, expiry and per-environment keys.** The design supports a label and a state, but
  decisions about read-only keys, scopes, or expiring keys change the create dialog.
- **How many keys per account, and what "last used" means** (a timestamp, or a coarse
  "never / recently").
  *Default:* labelled, non-expiring keys; `last used` timestamp; show prefix only after
  creation.

## Usage and metering

- **What counts as a job vs an operation?** The public contract has ten operations and the
  pricing page says every submitted operation is one job. The per-operation breakdown needs a
  precise definition, especially for `analyze` (which runs several analyses in one job).
- **Billing-period anchor:** calendar month, or the signup anniversary? The public FAQ says
  "next billing cycle"; the dashboard/usage copy shows a period with a reset date.
- **How long is job-level data kept vs the 12-month aggregate?** Drives whether "recent jobs"
  can show anything older than the retention window.
- **Quota-warning thresholds and reset timing, and the display timezone.**
  *Default:* calendar month, UTC shown; threshold 80%.

## Billing

- **Is Stripe approved as a vendor?** [EPSILON-44](https://linear.app/epsilon-records/issue/EPSILON-44)
  needs Nate's approval. The design assumes a hosted checkout and a hosted billing portal, and
  nothing more.
- **Overage rules.** The pricing page says Pro overages bill at $0.01/job and Free hard-stops.
  The console copy follows that, but it should be a recorded decision.
- **Dunning and grace period.** What stays working after a failed payment, and for how long?
- **Who owns cancellation** — the portal, the console, or both — and what the console shows
  for the rest of the paid period.
- **Currency, tax and invoice requirements.** Affects the billing table and portal only.
- **Downgrade timing.** Immediately or at period end? Wireframes default to period end.

## Data retention

- **Delete-account semantics.** What is deleted, what is retained (invoices for tax), whether
  deletion is immediate or has a grace period, and whether a receipt is emailed. The danger-zone
  copy depends on this.
- **Export.** Does a user get a data export before deletion? Not designed.

## Charts

- **No new vendor.** The design uses inline SVG and reuses the existing tokens/type. Confirm
  this is preferred over adding a charting library.
- **Whether charts need to be interactive** (zoom/brush) beyond hover/focus readouts. MVP
  assumes not.

## Other

- **Status-page link.** The side nav and footer point at a status page; no status vendor is
  chosen and no page exists today.
- **Public vs signed-in pricing.** Confirm `/pricing/` stays the marketing page and the
  console's `/console/plan` manages the plan (proposed here).
- **i18n and timezone.** MVP assumes English and UTC display.
- **Accessibility target.** Design assumes WCAG 2.1 AA as the floor; confirm.
