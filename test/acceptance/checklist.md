# Manual billing checklist

For the steps the smoke suite cannot do: they need the Stripe test dashboard, a browser on the
hosted Checkout page, or time to pass. Everything happens in **Stripe test mode**. Use a
throwaway account only, never a real card, and never switch the service to live mode.

Run the [smoke suite](README.md) first. Use the account from a separate run of its step 2, or
create a second throwaway the same way, and delete every account you create (section 10).
For each step write down the time, what you saw, and the test-mode ids (`cs_test_`, `cus_`,
`sub_`, `in_`, `evt_`). Mark a step failed when the result differs from "Expect".

## 0. Before you start

- [ ] The Stripe dashboard is showing **Test mode** (the toggle, and the `test` banner).
- [ ] Note the time you start, for matching service log lines later.
- [ ] Stop at once if any Checkout, portal or Stripe id says live (`cs_live_`, `pk_live_`,
      `livemode: true`, no "TEST MODE" banner on the Checkout page).

## 1. Signup and first key (smoke suite)

- [ ] The suite's signup, key, Free limits and first job steps pass.

## 2. Free quota hard stop

The suite cannot reach the limit (100 jobs, 10 stems) without spending compute. Check it once,
by one of these, and record which:

- [ ] Submit jobs on a throwaway Free account until the quota answers, or
- [ ] ask the service owner to lower the limit for one throwaway account for this check.

Expect: the next job answers `429 quota_exceeded` with the usage and limit, no overage is
recorded, and a stems job past 10 answers the stem cap, not a charge. A replay of an accepted
`job_id` still answers `200`.

## 3. Pro Checkout

- [ ] Sign in to the console as the throwaway account and choose Pro monthly.
- [ ] The hosted page shows the test banner. Pay with card `4242 4242 4242 4242`, any future
      expiry, any CVC, any postcode and a real-format billing address (Stripe Tax needs one).
- [ ] You return to the console. Expect: the plan shows Pro within a minute, the quota shows
      1,000 jobs and 250 stems, and there is no trial.
- [ ] Note `cs_test_`, `cus_`, `sub_` and the first `in_`. Expect one active subscription and a
      paid invoice in the dashboard. The API key still works and now has Pro limits.
- [ ] Starting Checkout again answers "already subscribed" and points at the portal.

## 4. Webhook idempotency

- [ ] In the dashboard open Developers, Webhooks, the endpoint, and the delivery for
      `checkout.session.completed` or `customer.subscription.created`.
- [ ] Resend it two times.
- [ ] Expect: each resend answers `200`; the service log shows the event as a duplicate; the
      account still has one subscription, the tier is unchanged and no second invoice or receipt
      appears. Record the `evt_` id and the three response times.
- [ ] With the signature header removed or altered, a delivery answers `400` or `401` and
      changes nothing (use the dashboard's "send test webhook" with a wrong secret, or ask the
      owner for a one-off request).

## 5. Customer portal

- [ ] From the console open the portal. The URL is `billing.stripe.com/p/session/test_...`.
- [ ] Expect: the plan, invoices and payment method are listed; switching to yearly works and
      the console follows; the portal's cancellation is set to cancel at period end.

## 6. Downgrade and cancel

Use a Stripe test clock attached to the customer if you need to move time (create the customer
on the clock before Checkout, or use a second throwaway account for this section).

- [ ] Cancel in the portal.
- [ ] Expect: the plan still shows Pro and the key keeps Pro limits until the period end.
- [ ] Advance the clock past the period end. Expect: `customer.subscription.deleted`, the plan
      and key move to Free, the account and key are kept, and the final period's overage (if any)
      is invoiced separately. Compare the invoice to the usage the console shows.
- [ ] Downgrading to Free from the console opens the portal and does not call Checkout.

## 7. Failed payment

- [ ] On an active Pro throwaway account, add card `4000 0000 0000 0341` in the portal (it
      attaches, then fails on charge).
- [ ] Advance the test clock to the next renewal.
- [ ] Expect: `invoice.payment_failed`, the subscription `past_due`, Pro access kept while
      Stripe retries, and an email about the failed payment. Record the first failure time.
- [ ] Advance seven calendar days past the first failure. Expect: Pro access ends and the account
      moves to Free; account and keys remain.
- [ ] Replace the card with `4242 4242 4242 4242` and pay the open invoice. Expect: Pro is
      restored.
- [ ] Repeat a second failure on the same account. Expect: no double downgrade and no error.

## 8. Refunds

- [ ] In the dashboard refund the throwaway payment, fully, from the test payment.
- [ ] Expect: the refund shows `succeeded` in Stripe. Record what the service does (receipt,
      plan, usage) and whether that matches the refund policy. A refund that leaves Pro active
      is expected unless the policy says otherwise; note it as a finding either way.

## 9. Account deletion while Pro

- [ ] On a throwaway account that is on Pro, delete the account from the console (type the
      address to confirm).
- [ ] Expect: the console signs out; the Stripe subscription is canceled immediately, with no
      refund and no final invoice; the Stripe customer is deleted; invoices remain in Stripe.
- [ ] The old API key answers `401` from both the billing service and the API, and signing in
      with the same address starts a brand new account.
- [ ] No confirmation email is sent.

## 10. Clean up

- [ ] Every throwaway account is deleted and its deletion confirmed (a `204`, then a rejected
      key). List them with their short ids in the run report.
- [ ] Delete leftover test clocks and test customers in the Stripe test dashboard.
- [ ] Confirm nothing in live mode changed: no live customers, charges or webhook endpoints
      were created during the run.
