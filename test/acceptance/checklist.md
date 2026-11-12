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

## 2. Free credits hard stop

Free is 100 credits a calendar month (UTC), AudioKit decision 0052. Reaching zero takes about 34
analyze jobs (3 credits each) or 100 single analyses. Check it once, by one of these, and record
which:

- [ ] Submit `probe` jobs (1 credit) on a throwaway Free account until the balance is spent, or
- [ ] ask the service owner to set one throwaway account's balance near zero for this check.

Expect: the next job is refused with an insufficient-credits error before any work starts, no
negative balance is created by a per-track job, and a replay of an accepted `job_id` still
answers `200` and is not charged again. A stems job needs at least 10 credits to be admitted.

Note (2026-11-12): billing on `main` holds the credit ledger and pack Checkout, but jobs are still
counted against the old 100-jobs quota. Until the debit at the entitlement check ships, this
section can only show the old quota stop. Record which behaviour you saw.

## 3. Buy a credit pack

- [ ] Sign in to the console as the throwaway account and buy the $10 pack (1,000 credits).
- [ ] The hosted page shows the test banner and is a one-time payment, not a subscription. Pay
      with card `4242 4242 4242 4242`, any future expiry, any CVC, any postcode and a
      real-format billing address (Stripe Tax needs one).
- [ ] You return to the console. Expect: within a minute the balance rises by 1,000, a
      purchased lot shows an expiry 12 months out, and the Free lot is unchanged.
- [ ] Note `cs_test_`, `cus_`, `pi_` and `in_`. Expect one paid invoice in the dashboard.
- [ ] Buying a second pack works and adds a second lot (packs are not "already subscribed").

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
      `billing.stripe.com/p/session/test_...` and the pack invoices are listed.
- [ ] Expect: nothing in the console or portal still offers Pro, a subscription or a downgrade.

## 6. Expiry and the monthly Free lapse

Use a Stripe test clock only if the service owner has a way to move the service's clock too; the
ledger uses the service's own time. Otherwise record this section as not run.

- [ ] Expect: unspent Free credits lapse at the end of the UTC month and 100 new ones appear;
      purchased credits are spent before they expire and are gone 12 months after purchase.

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
