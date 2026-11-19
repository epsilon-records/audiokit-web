# Manual billing checklist

For the steps the smoke suite cannot do: they need the Stripe test dashboard, a browser on the
hosted Checkout page, or time to pass. Everything happens in **Stripe test mode**. Use a
throwaway account only, never a real card, and never switch the service to live mode.

Run the [smoke suite](README.md) first. Use the account from a separate run of its step 2, or
create a second throwaway the same way, and delete every account you create (section 10).
Until a test-mode pack price is set in production (AudioKit 0066), the smoke suite's
`credits-balance` step (it expects the three packs on sale) and its credits Checkout step (it
expects `200` from `POST /v1/credits/checkout`) fail. Record those two failures as expected;
they don't block this checklist.
For each step write down the time, what you saw, and the test-mode ids (`cs_test_`, `cus_`,
`sub_`, `in_`, `evt_`). Mark a step failed when the result differs from "Expect".

## Who does what

The credits flow itself (holds, finalize, refusals, a signed `checkout.session.completed`, webhook
replay, usage and `/v1/credits`) is covered automatically in CI against a local stack: the
end-to-end suite in epsilon-billing (`test/e2e/`, workflow `e2e`). This checklist is only for what
must happen on production and needs a person. Each step writes to production (Stripe test mode),
so each run needs approval through the Oracle first.

| Step | Who | Why a person |
| --- | --- | --- |
| Smoke suite, request the link and run (section 1) | Nate | A real sign-up: the magic link goes to an inbox he can read, and the run creates a production account, a key and one job |
| Buy a pack in Checkout with test cards (sections 3, 7) | Nate | A browser on Stripe's hosted page. Blocked until a test-mode pack price is set in production: today Checkout answers `501` (AudioKit 0066) |
| Resend a webhook from the dashboard (section 4) | Nate | Needs the Stripe dashboard. The automated suite already proves replay idempotency with signed events |
| Refund in the dashboard (section 8) | Nate | Needs the Stripe dashboard |
| Delete the account from the console (sections 9, 10) | Nate | The typed confirmation in the console. The smoke suite deletes its own account through the API |

## 0. Before you start

- [ ] The Stripe dashboard is showing **Test mode** (the toggle, and the `test` banner).
- [ ] Note the time you start, for matching service log lines later.
- [ ] Stop at once if any Checkout, portal or Stripe id says live (`cs_live_`, `pk_live_`,
      `livemode: true`, no "TEST MODE" banner on the Checkout page).

## 1. Signup and first key (smoke suite)

- [ ] The suite's signup, key, Free limits and first job steps pass.

## 2. Free credits hard stop

Covered in CI by the end-to-end suite (refusal at submit and at a per-minute job's full cost). On
production it is optional. Free is 100 credits a calendar month (UTC), AudioKit decision 0052.
Reaching zero takes about 34 analyze jobs (3 credits each) or 100 single analyses. If you check it,
do it once, by one of these, and record which:

- [ ] Submit `probe` jobs (1 credit) to the AudioKit API (`POST /v1/jobs` with the account's API key; billing no longer takes jobs) on a throwaway Free account until the balance is spent, or
- [ ] ask the service owner to set one throwaway account's balance near zero for this check.

Expect: the next submit answers `402 insufficient_credits` and the job is stored as `refused` (it never runs; submit a new `job_id` after topping up), no
negative balance is created by a per-track job, and a replay of an accepted `job_id` still
answers `200` and is not charged again. A job answered `202` with status `awaiting_credit` is only waiting for billing to hold its credits: it becomes `queued` or `refused`. A stems job needs at least 10 credits to be admitted.

Note: the job is stored first and then billing holds its credits (AudioKit 0072), so the stop
above is the insufficient-credits refusal. A per-minute job admitted on its minimum can still fail
`insufficient_credits` once its full cost is known; its hold is released and it is not usage
(0073). The old 100-jobs quota and its 10-stem cap are gone. Free credits
are spent before purchased ones, then granted ones (AudioKit decision 0063). Record what you saw.

## 3. Buy a credit pack

Blocked until a test-mode pack price is set in production. Packs are not on sale at launch
(AudioKit 0066), so `POST /v1/credits/checkout` answers `501` and the console shows no Buy button.

- [ ] Sign in to the console as the throwaway account and buy the $10 pack (1,000 credits).
- [ ] The hosted page shows the test banner and is a one-time payment, not a subscription. Pay
      with card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode and a
      real-format billing address (Stripe Tax needs one).
- [ ] You return to the console. Expect: within a minute the balance rises by 1,000, a
      purchased lot shows no expiry (`expires_at: null`, AudioKit 0074; a release before
      epsilon-billing#79 still shows a date 12 months out, so record which), and the Free lot is
      unchanged.
- [ ] Note `cs_test_`, `cus_`, `pi_` and `in_`. Expect one paid invoice in the dashboard.
- [ ] Buying a second pack works and adds a second lot (packs are not "already subscribed").
- [ ] Spending order: on a fresh throwaway account that still holds its Free credits, buy one pack,
      record each lot's balance, submit one `probe` job (1 credit), and record the balances again.
      Expect: the Free lot is down by 1 and the purchased lot is unchanged. Free credits are spent
      before purchased ones (AudioKit decision 0063); the account in section 2 has no Free credits
      left, so it cannot show this.

## 4. Webhook idempotency

- [ ] In the dashboard open Developers, Webhooks, the endpoint, and the delivery for the pack's
      `checkout.session.completed`.
- [ ] Before resending, record the account's credit balance and its number of purchased lots.
- [ ] Resend it two times.
- [ ] Expect: each resend answers `200`, and the balance and the lot count are unchanged from what
      you recorded. Record the `evt_` id and the three response times.
- [ ] With the signature header removed or altered, a delivery answers `400` and changes nothing
      (the read-only probe checks the unsigned case on every run).

## 5. Customer portal

- [ ] From the console open billing or invoices. If it opens the Stripe portal, the URL is
      `billing.stripe.com/p/session/test_...` (or `/p/session?secret=test_...`) and the pack invoices are listed.
- [ ] Expect: nothing in the console or portal still offers Pro, a subscription or a downgrade.

## 6. Expiry and the monthly Free lapse

Use a Stripe test clock only if the service owner has a way to move the service's clock too; the
ledger uses the service's own time. Otherwise record this section as not run.

- [ ] Expect: unspent Free credits lapse at the end of the UTC month and 100 new ones appear;
      purchased credits never expire (AudioKit 0074).

## 7. Failed payment

- [ ] Start a pack Checkout and pay with `4000 0000 0000 0002` (declined).
- [ ] Expect: Checkout shows the decline, no credits are added, no lot is created, and the
      account keeps working on its existing balance.
- [ ] Pay with `4000 0000 0000 9995` (insufficient funds). Same expectation.

## 8. Refunds

Policy: credit packs are not refunded (AudioKit decision 0057); billing does not handle
`charge.refunded`. Shared decision 0040 allows refunds for errors during the beta.

- [ ] In the dashboard refund the throwaway pack payment, fully.
- [ ] Expect: the refund shows `succeeded` in Stripe, and billing leaves the lot unchanged.
      Record the balance before and after.

## 9. Account deletion with a credit balance

- [ ] On a throwaway account holding purchased credits, delete the account from the console
      (type the address to confirm).
- [ ] Expect: the console signs out; no refund is made for unspent credits; the Stripe customer
      is deleted; invoices remain in Stripe.
- [ ] The old API key answers `401` from both the billing service and the API, and signing in
      with the same address starts a brand new account with only the Free allowance.
- [ ] No confirmation email is sent.

## 10. Clean up

- [ ] Every throwaway account is deleted and its deletion confirmed (a `204`, then a rejected
      key). List them with their short ids in the run report.
- [ ] Delete leftover test clocks and test customers in the Stripe test dashboard.
- [ ] Confirm nothing in live mode changed: no live customers, charges or webhook endpoints
      were created during the run.
