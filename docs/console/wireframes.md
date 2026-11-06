# Wireframes

Low-fidelity, screen by screen. Boxes are layout, not pixels. `▸` marks the screen's primary
action; `…` is API content; `[ ]` / `( )` are controls. These wireframes reuse the tokens and
type from `src/static/styles.css` (see the map in the [README](README.md#design-foundation)).
Route names are a proposal — see the [open questions](open-questions.md#app-shape-and-hosting).

At the end of each screen: **States** and **Needs**.

---

## 0. Console shell

### Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✦ AudioKit          [ Free plan ]                        Docs ↗   you@… ▾    │
├──────────────────┬───────────────────────────────────────────────────────────┤
│  ▸ Dashboard     │  <page header>                                            │
│    Usage         │  ───────────────────────────────────────────────────────  │
│    API keys      │                                                           │
│    Plan          │  <page body>                                              │
│    Settings      │                                                           │
│                  │                                                           │
│  ───────────     │                                                           │
│  Docs ↗          │                                                           │
│  Status ↗        │                                                           │
│  API v0.x        │                                                           │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

- Side nav: 240 px, background `--bg-band`, active item underlined/barred with `--accent`.
- Top bar: 56 px, `--bg`, bottom rule `--line`. Plan badge uses `--accent-soft` at rest,
  `--warn` wash when past due.
- Body: max width ~1100 px with 32 px gutters (matches `.wrap`), page background `--bg`.
- Banners (quota, past due) sit directly under the top bar and span the body width.

### Mobile (≤ 720 px)

```
┌───────────────────────────────┐
│ ☰  ✦ AudioKit     [Free]  ▾   │
├───────────────────────────────┤
│  <quota banner if any>        │
├───────────────────────────────┤
│  <page header>                │
│  ───────────────────────────  │
│  <page body, single column>   │
└───────────────────────────────┘
```

`☰` opens a drawer with the same primary nav plus the outward links. Dense tables become
stacked rows (label above value), the same pattern the docs field tables already use.

**States:** expires → re-auth prompt; account menu → profile / billing / sign out.
**Needs:** account, plan, quota summary (for the badge and banners).

---

## 1. Login

```
                         ✦ AudioKit
                 Sign in to your console

        ┌─────────────────────────────────────┐
        │  Email                              │
        │  [ you@example.com              ]   │
        │                                     │
        │  Password                           │
        │  [ ••••••••••••            ]        │
        │                      Forgot password?│
        │                                     │
        │  ▸ [        Sign in            ]    │
        └─────────────────────────────────────┘

        New to AudioKit?  Create an account
        Read the docs ↗
```

Centered card, `--panel`, max width 420 px, on `--bg`. No console shell; a small brand mark
at the top. Public header may be kept or reduced — see the open question on chrome.

**States:** idle · submitting · wrong credentials (single generic message above the form) ·
unverified email (message + "Resend verification") · rate-limited · service error.
**Needs:** authenticate.

---

## 2. Register

```
                         ✦ AudioKit
                 Create your AudioKit account

        ┌─────────────────────────────────────┐
        │  Email                              │
        │  [ you@example.com              ]   │
        │                                     │
        │  Password                           │
        │  [ ••••••••••••            ]        │
        │  ≥ 12 characters, …                 │
        │                                     │
        │  [ ] I agree to the terms           │
        │                                     │
        │  ▸ [     Create account        ]    │
        └─────────────────────────────────────┘

        Already have an account?  Sign in
        Start on the Free plan — 100 jobs/month, no card.
```

**States:** idle · submitting · email taken (generic, with a "sign in instead" link) · weak
password · terms required · rate-limited.
**Needs:** create account, start Free plan, send verification.

---

## 3. Forgot password

```
                    Reset your password

        Enter your email and we'll send a reset link.

        ┌─────────────────────────────────────┐
        │  Email                              │
        │  [ you@example.com              ]   │
        │  ▸ [     Send reset link       ]    │
        └─────────────────────────────────────┘

        ← Back to sign in
```

**States:** idle · sent (confirmation replaces the form; identical wording whether or not the
account exists) · rate-limited.

---

## 4. Reset password

```
                    Choose a new password

        ┌─────────────────────────────────────┐
        │  New password       [ ••••••••   ]  │
        │  Confirm password   [ ••••••••   ]  │
        │  ▸ [     Update password       ]    │
        └─────────────────────────────────────┘
```

**States:** valid token · expired/used token (offer a new link) · mismatch · weak · success.
**Needs:** reset token, set password.

---

## 5. Verify email

Shown as a full screen after register and reachable from the persistent banner.

```
                       Check your inbox

        We sent a confirmation link to you@example.com.

        ▸ [   Resend confirmation   ]     [ Change email ]
```

Banner form, on every console screen while unverified:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Confirm your email to unlock API keys.   [Resend]   [Open inbox]      │
└──────────────────────────────────────────────────────────────────────┘
```

**States:** sent · resent (cooldown) · verified → banner clears · expired link.

---

## 6. Dashboard

```
  Dashboard                                    ── page header
  ────────────────────────────────────────────────────────────────
                                              last updated 12:04
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Jobs / month │ │ Remaining    │ │ Plan         │ │ API keys     │
  │    … 412     │ │   … 5,588    │ │  Free        │ │  2 active    │
  │  Free · 100  │ │              │ │  renews …    │ │  [Manage →]  │
  │  [quota bar] │ │              │ │  [Upgrade ▸] │ │              │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

  Recent jobs                                     [View all →]
  ┌──────────────────────────────────────────────────────────────┐
  │ Job id      │ Operation │ Status     │ Created       │ Detail │
  ├─────────────┼───────────┼────────────┼───────────────┼────────┤
  │ … a1b2c3d4  │ analyze   │ ● succeeded│ … 12:01       │   →    │
  │ … e5f6a7b8  │ transcode │ ● running  │ … 11:58       │   →    │
  │ … c9d0e1f2  │ tags      │ ● failed   │ … 11:40       │   →    │
  └──────────────────────────────────────────────────────────────┘

  Quick start
  ┌──────────────────────────────────────────────────────────────┐
  │  Base URL   https://api.audiokit.ai          [ Copy ]         │
  │  curl -X POST …/v1/jobs …        Get started guide ↗          │
  └──────────────────────────────────────────────────────────────┘
```

Four stat tiles: the quota tile carries the progress bar and turns `--warn` near/over the
limit. Recent jobs shows the newest ~5 and links to Usage for the full list. Quick start is
collapsible and remembers its state.

### Empty (new account)

```
  ┌──────────────────────────────────────────────────────────────┐
  │  No jobs yet.                                                 │
  │  Create an API key, then submit your first job.               │
  │  ▸ [ Create API key ]        Read the guide ↗                 │
  └──────────────────────────────────────────────────────────────┘
```

**States:** loading (tiles + table skeletons) · empty · populated · partial (tiles ready,
table retrying) · quota warning/exceeded banner.
**Needs:** current-period count, quota limit/remaining, plan + renewal, recent jobs, base URL.

---

## 7. Usage

```
  Usage
  ────────────────────────────────────────────────────────────────
  Period:  [ This billing period ▾ ]          1 Nov – 30 Nov

  ┌──────────────────────────────────────────────────────────────┐
  │  Jobs                                      Quota  … 100        │
  │  ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  … 41%       │
  │                                                               │
  │  ╭─ chart ─────────────────────────────────────────────────╮  │
  │  │  ▁ ▂ ▃ ▅ ▇ ▆ ▄ ▃ ▂ ▁ ▂ ▄ ▆ ▇ ▅ ▃ ▂ ▁                    │  │
  │  │  (jobs per day; hover a point for its value)            │  │
  │  ╰─────────────────────────────────────────────────────────╯  │
  └──────────────────────────────────────────────────────────────┘

  By operation                                        [ table ⇄ ]
  ┌──────────────────────────────────────────────────────────────┐
  │ Operation   │ Jobs │ Share                             │      │
  ├─────────────┼──────┼───────────────────────────────────┼──────┤
  │ analyze     │  …   │ ████████████████████  48%         │      │
  │ transcode   │  …   │ ██████████  24%                   │      │
  │ tags        │  …   │ ██████  15%                       │      │
  │ loudness    │  …   │ ████  9%                          │      │
  │ other       │  …   │ ██  4%                            │      │
  └──────────────────────────────────────────────────────────────┘

  History — last 12 periods
  ┌──────────────────────────────────────────────────────────────┐
  │  Period     │ Jobs │ Limit │ Status                            │
  ├─────────────┼──────┼───────┼───────────────────────────────────┤
  │  Nov 2026   │  …   │ 100   │ within quota                      │
  │  Oct 2026   │  …   │ 100   │ quota reached                     │
  │  …          │      │       │                                   │
  └──────────────────────────────────────────────────────────────┘
```

Chart and breakdown always have a table equivalent (the `[ table ⇄ ]` toggle and the
history table itself). Colour is never the only signal.

**States:** new account (chart + table empty, with a submit-first-job CTA) · current period
empty but history present · history still loading · operation list includes an "other" bucket
for retired operations · large counts.
**Needs:** per-day (or per-bucket) counts for the period, per-operation counts, 12 periods of
counts + limits, period boundaries.

---

## 8. API keys

```
  API keys                                    ▸ [ Create key ]
  ────────────────────────────────────────────────────────────────
  Keep keys secret. They authorise jobs and are billed to your plan.

  ┌──────────────────────────────────────────────────────────────┐
  │ Label        │ Key         │ Created   │ Last used │          │
  ├──────────────┼─────────────┼───────────┼───────────┼──────────┤
  │ production   │ ak_live_…4f2│ … 1 Nov   │ … 12:01   │ [Revoke] │
  │ laptop       │ ak_live_…9c1│ … 3 Nov   │ … 2 days  │ [Revoke] │
  │ (revoked) ci │ ak_live_…77a│ … 28 Oct  │ … never   │  —       │
  └──────────────────────────────────────────────────────────────┘
```

### Create key dialog

```
  ┌───────────────────────────────────────────────┐
  │  Create API key                          [x]   │
  │  Label (optional)                              │
  │  [ staging                              ]      │
  │                                                │
  │  ▸ [ Create key ]        [ Cancel ]            │
  └───────────────────────────────────────────────┘
```

### Reveal (once)

```
  ┌───────────────────────────────────────────────┐
  │  Key created — copy it now                [x]  │
  │  This is the only time we'll show it.          │
  │  ┌─────────────────────────────────────────┐   │
  │  │ ak_live_1a2b3c4d5e6f7g8h9i0j     [ Copy ]│   │
  │  └─────────────────────────────────────────┘   │
  │  ▸ [ Done ]                                    │
  └───────────────────────────────────────────────┘
```

### Revoke confirmation

```
  Revoke "production" (ak_live_…4f2)?
  Any client using this key will start failing immediately. This can't be undone.
  ▸ [ Revoke key ]     [ Keep key ]
```

**States:** loading · empty (no keys → create CTA) · populated · create failed · too many
keys · reveal dismissed without copying · revoked rows kept for audit (per retention decision).
**Needs:** key list (label, prefix, created, last used, state), create, revoke; full key once.

---

## 9. Settings · profile

```
  Settings
  Profile │ Billing │ Notifications │ Account      (tabs)
  ────────────────────────────────────────────────────────────────

  Profile
  ┌──────────────────────────────────────────────────────────────┐
  │  Name     [ Nate Houk                              ]          │
  │  Email    [ you@example.com            ] ✓ verified           │
  │  ▸ [ Save changes ]                                           │
  └──────────────────────────────────────────────────────────────┘

  Password
  ┌──────────────────────────────────────────────────────────────┐
  │  Current  [ •••••••• ]                                        │
  │  New      [ •••••••• ]   ▸ [ Update password ]                │
  └──────────────────────────────────────────────────────────────┘
```

**States:** saving · saved (inline confirmation) · email change requires re-verification ·
wrong current password.
**Needs:** read/update profile; change password.

---

## 10. Settings · billing

```
  Settings
  Profile │ Billing │ Notifications │ Account
  ────────────────────────────────────────────────────────────────

  Plan
  ┌──────────────────────────────────────────────────────────────┐
  │  Free plan                        100 jobs / month            │
  │  Renews / resets … 1 Dec 2026                                │
  │  ▸ [ Upgrade to Pro ]              [ Change plan → ]          │
  └──────────────────────────────────────────────────────────────┘

  Payment
  ┌──────────────────────────────────────────────────────────────┐
  │  No payment method on file.                                  │
  │  [ Open billing portal ↗ ]                                    │
  └──────────────────────────────────────────────────────────────┘

  Invoices                                          [ portal ↗ ]
  ┌──────────────────────────────────────────────────────────────┐
  │  Date        │ Amount │ Status   │ Invoice                    │
  ├──────────────┼────────┼──────────┼────────────────────────────┤
  │  …           │  $99   │ paid     │ View ↗                     │
  └──────────────────────────────────────────────────────────────┘
```

The Stripe billing portal (pending EPSILON-44 approval) is the place payment details and
invoices are managed; the console shows a summary and links out. Past due adds a banner above
the tabs and a `--warn` payment block.

**States:** free (no payment method) · pro (method + invoices) · past due · portal unavailable.
**Needs:** plan, payment-method summary, invoices, portal session.

---

## 11. Settings · notifications

```
  Settings
  Profile │ Billing │ Notifications │ Account
  ────────────────────────────────────────────────────────────────

  Email preferences
  ┌──────────────────────────────────────────────────────────────┐
  │  Quota warnings       [x]  at 80% and at the limit            │
  │  Payment receipts     [x]  always                              │
  │  Product updates      [ ]  occasional                          │
  │  ▸ [ Save preferences ]                                       │
  └──────────────────────────────────────────────────────────────┘
```

**States:** saving · saved · transactional mail that cannot be disabled is shown as such.
**Needs:** preference flags.

---

## 12. Settings · account (danger zone)

```
  Settings
  Profile │ Billing │ Notifications │ Account
  ────────────────────────────────────────────────────────────────

  Session
  ┌──────────────────────────────────────────────────────────────┐
  │  [ Sign out ]                                                 │
  └──────────────────────────────────────────────────────────────┘

  ⚠ Danger zone
  ┌──────────────────────────────────────────────────────────────┐
  │  Delete account                                               │
  │  Revokes all API keys and removes your jobs and usage data.   │
  │  Invoices are kept for tax. This can't be undone.             │
  │  [ Delete account… ]                                          │
  └──────────────────────────────────────────────────────────────┘
```

Delete confirmation:

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Delete account                                          [x]  │
  │  Type you@example.com to confirm.                            │
  │  [                                             ]              │
  │  Active subscription? Cancel it first.                        │
  │  ▸ [ Delete account ]        [ Cancel ]                       │
  └──────────────────────────────────────────────────────────────┘
```

**States:** blocked while subscribed · blocked while past due · mismatch · success (sign out +
email receipt).
**Needs:** delete-account request; sign out.

---

## 13. Plan (signed-in pricing)

```
  Plan
  ────────────────────────────────────────────────────────────────
  You're on the Free plan — 100 jobs/month, renews … 1 Dec.

  ┌───────────────┐  ┌───────────────────────┐  ┌───────────────┐
  │  Free         │  │  Pro   [ Most popular ]│  │  Enterprise   │
  │  $0 / month   │  │  $99 / month          │  │  Custom       │
  │  ✓ current    │  │  10,000 jobs / month  │  │  Contact sales│
  │               │  │  Priority processing  │  │               │
  │               │  │  ▸ [ Upgrade to Pro ] │  │  [ Contact ]  │
  └───────────────┘  └───────────────────────┘  └───────────────┘

  Already Pro?  [ Change plan → ]   [ Open billing portal ↗ ]
```

Reuses the public `.pricing-*` cards but marks the current plan and swaps the CTA for the
signed-in action. Delta vs current plan is stated on each card ("adds 9,900 jobs/month"
rather than repeating the whole feature list).

**States:** free · pro (current marked; downgrade offered at period end) · past due · checkout
in progress (button disabled + note) · enterprise → contact.
**Needs:** plan catalogue, current plan, checkout session.

---

## 14. Upgrade return

### Success — `/console/upgrade/success`

```
  ┌──────────────────────────────────────────────────────────────┐
  │  ✓  You're on Pro.                                            │
  │     10,000 jobs/month, renews … 1 Dec 2026.                   │
  │     A receipt is on its way to you@example.com.               │
  │  ▸ [ Go to dashboard ]     [ View billing ]                   │
  └──────────────────────────────────────────────────────────────┘
```

### Processing (webhook not confirmed yet)

```
  ┌──────────────────────────────────────────────────────────────┐
  │  ◐  Payment received — activating your plan.                  │
  │     This usually takes a few seconds. You can safely leave.   │
  └──────────────────────────────────────────────────────────────┘
```

### Cancelled — `/console/upgrade/cancelled`

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Checkout cancelled — you haven't been charged.               │
  │  ▸ [ Try again ]        [ Back to plan ]                      │
  └──────────────────────────────────────────────────────────────┘
```

**States:** success · processing · cancelled · failed payment. Never claim Pro until the plan
state confirms it.
**Needs:** checkout result, resulting plan.

---

## 15. Shared states

### Loading skeletons

```
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ ▒▒▒▒▒▒▒▒▒▒▒ │ │ ▒▒▒▒▒▒▒▒▒▒▒ │ │ ▒▒▒▒▒▒▒▒▒▒▒ │
  │ ▒▒▒▒▒▒▒▒     │ │ ▒▒▒▒▒▒▒▒     │ │ ▒▒▒▒▒▒▒▒     │
  └──────────────┘ └──────────────┘ └──────────────┘
  ┌─────────────────────────────────────────────────┐
  │ ▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒▒▒                     │
  │ ▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒▒▒                     │
  └─────────────────────────────────────────────────┘
```

Skeletons match the shape of the loaded content. A full-page spinner is only for first paint.

### Quota banner

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  ⚠  You've used 82 of your 100 free jobs this period.                 │
  │     [ Upgrade to Pro ]   resets … 1 Dec                              │
  └──────────────────────────────────────────────────────────────────────┘
```

At the limit, the same banner turns `--warn` and job-blocking copy replaces the hint.

### Past-due banner

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  ⚠  Payment failed. Update your card to keep Pro after … 8 Nov.       │
  │     [ Open billing portal ↗ ]                                        │
  └──────────────────────────────────────────────────────────────────────┘
```

### Region error

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Couldn't load usage.   [ Retry ]                                     │
  └──────────────────────────────────────────────────────────────────────┘
```

Region-level, not page-level, wherever the rest of the page can still render.

### Table → stacked rows (narrow screens)

```
  Job a1b2c3d4
  Operation   analyze
  Status      ● succeeded
  Created     … 12:01
  [ Detail → ]
```

**States summary:** loading · empty(new) · empty(filtered) · partial · error · unauthenticated
· expired session · quota warning/exceeded · past due · canceled-at-period-end.
