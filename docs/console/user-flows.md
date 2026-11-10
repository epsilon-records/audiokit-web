# User flows

Each flow lists the trigger, the steps, the states it can end in, and the edge cases the
console must handle. Screens are named as in
[information architecture](information-architecture.md); wireframes are in
[wireframes.md](wireframes.md). No flow here decides implementation.

---

## F1. Register → first API key → first job (the critical path)

**Goal:** go from "never heard of AudioKit" to a submitted job with the fewest surprises.
The plan's target is under two minutes.

1. Visitor clicks **Get started free** on `/pricing/` (or **Sign in → Create account**).
2. **Register** — email, password, optional name. Acceptable-use/terms checkbox if legal
   pages exist ([open question](open-questions.md#legal)).
3. Account is created on the **Free** plan; user lands on the **Dashboard**.
4. Dashboard empty state: "Create your first API key." One primary action.
5. **Create key** — optional label → key shown **once** with a copy control and a warning that
   it will not be shown again.
6. Empty state updates to a two-step quick start: base URL + "submit a job" snippet linking to
   `/docs/`.
7. First job appears in **Recent jobs**; quota reflects it.

**States:** created · email-verification pending · weak password blocked · email already
registered · rate-limited.
**Edge cases:** user closes the reveal before copying → they can create another key; show the
warning, never re-display the secret.
**Open:** is email verification required before API use, or a nudge? See
[open questions](open-questions.md#auth).

---

## F2. Sign in

1. From the public header or a deep link to a console route.
2. **Login** — email + password; primary action `Sign in`.
3. On success, go to the requested route, else the **Dashboard**.

**States:** success · wrong credentials (generic error, never "no such user") · account
locked/rate-limited · unverified email (offer resend) · service error.

---

## F3. Session expiry mid-task

1. User has been away; a request fails with unauthenticated.
2. Console shows a re-auth prompt (modal) rather than a bare redirect when the failure
   happens inside an action (e.g. revoking a key).
3. After re-auth, the action resumes or the user is returned to the current screen.
4. If they were on a form, do not lose typed values.

**Edge cases:** multiple tabs — signing out in one should not silently break the others;
each tab re-auths on its next request.

---

## F4. Password reset

1. **Login → Forgot password** → email form.
2. Always show the same "if that address exists, we've sent a link" confirmation (no account
   enumeration).
3. Email link opens **Reset password** with a token; new password + confirm.
4. Success → sign in, or straight in, depending on the auth model
   ([open question](open-questions.md#auth)).

**States:** link expired/used · weak password · mismatch · success.
**Edge cases:** reset while signed in elsewhere → decide whether to invalidate other sessions
([open question](open-questions.md#sessions)).

---

## F5. Verify email

1. After register (if required), a banner on every console screen: "Confirm your email."
2. **Verify email** screen / emailed link confirms the address.
3. Banner clears; unverified accounts have limited actions until then.

**Edge cases:** already verified · expired link (offer resend) · changed email.

---

## F6. Create an API key

1. **API keys** → `Create key` `▸`.
2. Dialog: optional label; explain what the key is for.
3. On create, show the key once: full value in a `.code` block with **Copy**, plus a warning.
4. Dialog closes; the list shows the new key (label, prefix, created, last used).

**States:** create failed · too many keys · reveal dismissed without copying.
**Open:** key scoping (read-only vs full), expiry, per-environment keys
([open questions](open-questions.md#api-keys)).

---

## F7. Revoke an API key

1. **API keys** → row action `Revoke`.
2. Confirmation names the key (label + prefix) and states that clients using it will start
   failing.
3. On confirm, the row moves to a **Revoked** state (kept for audit) or disappears, per the
   data-retention decision.

**Edge cases:** revoking the key used by the current CLI/docs example; revoking the last key
while jobs are running; irreversible — confirm explicitly.

---

## F8. Monitor usage (dashboard glance → detail)

1. **Dashboard** answers "am I within quota?" in one glance: a quota bar, jobs this period,
   remaining, plan name.
2. User clicks through to **Usage**.
3. **Usage** shows the current period chart, a per-operation breakdown, and 12-month history.
4. Hovering/selecting a point or row filters or explains; a text table gives the same values.

**States:** new account (no data) · partial history loading · no activity this period but
history exists · very large counts (formatting).
**Open:** what counts as a "job" vs an "operation" run, and the billing-period anchor
([open questions](open-questions.md#usage-and-metering)).

---

## F9. Approaching or hitting quota

1. While usage crosses a threshold (e.g. 80%), the Dashboard and Usage screens show a warning
   banner with an upgrade CTA (mirrored by an email, already in the plan).
2. At 100% on Free, job submission stops: banner explains, upgrade CTA is primary.
3. On Pro with overage, copy explains the per-job overage rather than blocking.

**States:** warning · exceeded (Free) · overage accruing (Pro) · reset date shown.
**Open:** thresholds, grace, whether warnings are configurable
([open questions](open-questions.md#usage-and-metering)).

---

## F10. Upgrade to Pro

1. From **Plan** (signed in) or the public `/pricing/`.
2. **Plan** shows the current plan first, then the other options with a clear delta.
3. `Upgrade to Pro` `▸` → hosted checkout (Stripe, pending EPSILON-44 approval). This is an
   external step; the console hands off and returns.
4. Return to **`/console/upgrade/success`**: confirm the new plan, renewal date and limits.
5. Plan badge in the top bar updates; quota limits increase immediately.

**States:** success · cancelled (no charge, back to Plan) · checkout abandoned · payment
requires action (3-D Secure) · webhook delayed (show "processing" honestly, don't claim Pro
until confirmed).
**Edge cases:** upgrading twice; upgrading while past due; downgrade at period end
([open questions](open-questions.md#billing)).

---

## F11. Manage billing (portal)

1. **Settings · billing** → `Open billing portal` → hosted portal (payment method, invoices,
   cancel).
2. Return to **`/console/billing/return`**; the console re-reads plan state.

**States:** portal unavailable · return with changes · return with none.
**Open:** who owns cancellation UX, what the console shows during dunning.

---

## F12. Payment failure / past due

1. A payment fails; the console enters **past due**.
2. Persistent banner: "Payment failed — update your card", with the portal link.
3. Plan badge shows a warning state; copy states the grace period and what stops when it ends.

**States:** retrying · recovered (banner clears) · downgraded to Free.
**Open:** grace period length and what is disabled
([open questions](open-questions.md#billing)).

---

## F13. Delete account (danger zone)

1. **Settings · account** → **Delete account**, visually separated, not the primary action.
2. Confirmation requires typing the account email (or the word `delete`) and states exactly
   what happens: keys revoked, jobs and usage data gone or retained per policy, invoices
   retained for tax, plan cancelled.
3. On confirm, sign out and show a closing confirmation; email a receipt of the deletion.
4. If jobs are in flight, explain what happens to them first.

**As built (decision 0042):** typing the account email enables **Delete account**; the console
calls `POST /v1/account/deletion` on the billing service, which revokes the keys, erases the API's
jobs, cancels any subscription and deletes the Stripe customer, then the account. Nothing blocks on
an active subscription: it is cancelled immediately, with no refund and no final invoice. On
success the session is cleared and `/login` says the account was deleted. If the service could only
finish part of it, the form shows the error and the same button resumes it. Invoice and payment
records are kept 7 years (Dutch tax law); everything else is deleted. No receipt email is sent.

**States:** confirmation mismatch · service could not finish (retry) · success.
**Open:** whether to email a receipt of the deletion
([open questions](open-questions.md#data-retention)).

---

## F14. Sign out

1. Account menu → **Sign out**.
2. Clear the session and return to `/` (or `/login`), never leaving cached console data
   visible on the back button.

**Edge cases:** other tabs (see F3); signing out while a job is running is harmless.

---

## F15. Copy API key / base URL / job id

1. `.copy` controls appear next to keys (at creation), the base URL, and job ids.
2. Copy gives brief inline confirmation ("Copied"), and must work without a mouse.

---

## Cross-flow requirements

- **Never block a whole page** for one failed request; degrade region by region.
- **Every destructive action** is named and confirmed; every irreversible one (key reveal,
  key revoke, delete account) is explicit about being irreversible.
- **Every external hop** (checkout, portal) has a defined return route and a truthful
  landing state.
- **Every list** has empty, loading, error and populated states.
- **Deep links survive auth.**
