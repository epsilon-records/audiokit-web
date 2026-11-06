# Billing service roadmap

Planned work after the service was committed under `services/billing/`
(decision
[0014](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0014-freemium-billing-service.md)).
Nothing here is wired into the service yet.

## 1. Stripe (its own task)

Stripe is the approved payment vendor. This is intentionally not part of landing
the service, and the service ships with no Stripe dependency or configuration.

- Create a customer on registration; store `stripe_customer_id` on the
  subscription.
- Checkout and billing-portal endpoints under `/v1/subscriptions`.
- Verify and handle webhooks at `/webhooks/stripe` (currently `501`), recording
  events in `webhook_events` before acting on them.
- Apply subscription changes to the subscription row and to `api_keys.tier`.
- The plan rows already exist in `schema.sql`; prices and limits are separate
  decisions.

## 2. Email

- Verification and password-reset emails (tokens are already generated and
  stored).
- Quota-warning and quota-exceeded notices.

## 3. Worker integration

- Forward an accepted job to the AudioKit worker.
- Accept worker status callbacks and update `jobs`.
- Deliver client webhooks with retries (`webhook_attempts`,
  `webhook_delivered_at` are already in the schema).

## 4. Billing periods

- Roll usage records over at `current_period_end`
  (`UsageService.resetUsageForNewPeriod` is already there).
- Compute overage charges (`UsageService.calculateOverageCharges`) and invoice
  them through Stripe.

## 5. Hardening

- Integration tests against a throwaway Postgres.
- Structured request logging and metrics.
- Per-tier rate limits.
