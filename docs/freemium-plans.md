# AudioKit freemium plans

**Status: draft — not approved.** This document defines the Free, Pro and Enterprise plans that back the
[pricing page](../src/pages/pricing.html). It exists so the plan rules, quotas, overage handling and
upgrade/downgrade/cancellation behaviour are written down in one place before any billing work starts.

Everything marked **Decision needed** is a proposal only. Prices, overage rates and the payment vendor
are Nate's calls and are *not* decided here. Nothing in this document adds a vendor or changes code.

- Draft date: 2026-11-06
- Owner: product (Nate)
- Related: pricing page, Linear EPSILON-44

## Decisions needed from Nate

These block a real billing implementation (EPSILON-44). Each is a product/pricing decision, not an
engineering one.

| # | Decision | Current draft / proposal | Notes |
| --- | --- | --- | --- |
| D1 | Approve a payment vendor | **Not approved.** EPSILON-44 assumes Stripe; that is a **new vendor** | Required before any payment code or integration |
| D2 | Pro monthly price | `$99/month` (as shown on the live pricing page) | Confirm or change |
| D3 | Pro overage rate | `$0.01/job` (as shown on the live pricing page) | Confirm or change |
| D4 | Pro overage behaviour | Allow overages and bill them | Alternative: hard-stop like Free |
| D5 | Free plan quota | `100 jobs/month`, hard limit | Confirm |
| D6 | Enterprise quota | "Unlimited" | Decide whether a fair-use cap applies |
| D7 | Enterprise price | `Custom` | Floor / volume-discount model undecided |
| D8 | Trial | Free plan is the only trial (no card) | Decide whether to add a time-limited Pro trial |
| D9 | Billing period anchor | Calendar month | Alternative: signup anniversary |
| D10 | Upgrade timing | Takes effect next billing cycle | Decide whether upgrades apply immediately with proration |
| D11 | Downgrade timing and over-limit rule | Next billing cycle | What if the account is already over the lower tier's quota at downgrade? |
| D12 | Cancellation | Access to end of paid period | Decide data / API-key retention window after that |
| D13 | SLA credits | 99.9% target for Pro/Enterprise | Credit schedule undecided |
| D14 | Non-profit / education discount | Offered (per pricing FAQ) | Size of discount undecided |
| D15 | Currency and tax | USD | Tax handling (VAT/sales tax) undecided |
| D16 | Refunds | Undecided | Needed for terms |
| D17 | What counts as a job | Every submitted operation counts once | Failed/canceled/retried jobs undecided (see below) |

## Plans at a glance

Prices and rates below are the values currently shown on the pricing page. They remain **proposals**
until Nate confirms D2–D7.

| | Free | Pro | Enterprise |
| --- | --- | --- | --- |
| Price | $0/month | $99/month *(D2)* | Custom *(D7)* |
| Monthly job quota | 100, hard limit *(D5)* | 10,000 | Unlimited *(D6)* |
| Over quota | Processing stops until next cycle or upgrade | Overage billed at $0.01/job *(D3, D4)* | Custom arrangement |
| Analysis operations | All | All | All |
| Processing operations | All | All | All |
| Webhook delivery | Yes, HMAC-signed | Yes, HMAC-signed | Yes, HMAC-signed |
| Processing priority | Standard | Priority | Dedicated infrastructure |
| Support | Community | Email | Priority, dedicated contact |
| Uptime SLA | None | 99.9% *(D13)* | Custom |
| Billing | None | Monthly, card *(D1)* | Contract; invoice / bank transfer |

Non-profit and education pricing is available on request (D14).

## Tier definitions

### Free

- **Price:** $0/month.
- **Quota:** 100 jobs per billing period, a hard limit.
- **Included:** all analysis and processing operations, webhook delivery, HMAC-signed webhooks,
  community support. No credit card required.
- **Over quota:** job submissions are rejected with `429 Too Many Requests` (error
  `quota_exceeded`) until the next billing period or an upgrade. No overages are incurred on Free.
- **Purpose:** evaluation and small projects; the Free plan is the trial (D8).

### Pro

- **Price:** $99/month (D2), billed monthly.
- **Quota:** 10,000 jobs per billing period.
- **Included:** everything on Free, plus priority processing, email support and a 99.9% uptime SLA
  (D13).
- **Over quota:** overages are allowed and billed at $0.01/job (D3, D4). Free plan (over quota) has
  no equivalent.
- **Purpose:** production use by small teams.

### Enterprise

- **Price:** custom (D7).
- **Quota:** unlimited (D6) unless a fair-use cap is agreed.
- **Included:** everything on Pro, plus dedicated infrastructure, custom integrations, priority
  support, custom SLAs, volume discounts and a dedicated account manager.
- **Billing:** contract; invoice or bank transfer.
- **Purpose:** large-scale operations.

## What counts as a job

*Decision needed (D17).* A job is one API operation submission — e.g. an analysis, transcode or
fingerprint request — regardless of file size or processing time. Open questions to settle before
metering is final:

- Does a job that fails, errors or is canceled still count toward the quota?
- Does a client retry of the same operation count again, or is it deduplicated?
- Idempotency: repeated submissions that reuse the same client-supplied job ID should count once.
  Confirm this is the rule.

## Quotas and enforcement

- Usage is counted **per account, per billing period**. The period anchor is undecided (D9);
  calendar month is the draft.
- Enforcement happens before a job is accepted, so a rejected submission does not consume quota.
- **Free:** reject when the quota is reached (HTTP 429, `quota_exceeded`).
- **Pro:** accept over the quota and record the overage for billing.
- **Enterprise:** no enforced quota (unlimited) unless a cap is agreed under D6.
- The console/API should expose current usage, quota remaining and overage count so customers are
  not surprised. Quota-warning notifications are part of the eventual implementation, not this doc.

## Overage rules

- Overage only exists on Pro (D4). The rate is $0.01/job (D3).
- Overage is metered per billing period and billed in arrears with the next invoice (or a separate
  overage invoice). Confirm the billing cadence.
- Free plan: no overages — hard stop instead.
- Enterprise: handled in the custom agreement.
- Overage is only charged for jobs the service accepted, once D17 is settled.

## Trial

- Draft: the **Free plan is the trial**. Every new account starts on Free with 100 jobs/month and no
  credit card, as stated on the pricing page.
- There is currently **no separate Pro or Enterprise trial**. Whether to add one — length, quota,
  card requirement — is D8.
- Any trial would need to define what happens on expiry: revert to Free (and hard-stop over 100
  jobs) or require a card to continue.

## Upgrade, downgrade and cancellation

- **Upgrade (Free → Pro):** available at any time. Draft rule is that it takes effect at the start of
  the next billing cycle (D10); an immediate, prorated upgrade is the alternative.
- **Downgrade (Pro → Free or Enterprise → Pro):** available at any time, effective at the start of the
  next billing cycle (D11). Open question: what happens when the account is already over the lower
  tier's quota at the changeover (hard-stop, or a one-period grace)?
- **Cancellation:** draft rule is that paid access continues to the end of the current paid period and
  does not renew. Decide the retention window for job history and API keys afterwards (D12). Free
  accounts have no billing to cancel.
- No setup fees. Free and Pro are month-to-month with no long-term commitment; Enterprise terms are
  negotiated.

## Terms outline (short)

A starting outline for a public terms/SLA document. Items marked **Decision needed** must be settled
first; this is not legal text.

1. **Service** — metered access to AudioKit's audio analysis and processing API.
2. **Plans and pricing** — Free, Pro and Enterprise as above; prices may change with notice.
3. **Usage metering** — jobs counted per billing period per account; overage on Pro at the published
   rate (D3).
4. **Billing** — Pro billed monthly by card; Enterprise by contract/invoice. Currency USD (D15).
   Taxes handled per jurisdiction (D15).
5. **Trial** — new accounts start on Free; no card required (D8).
6. **Upgrades, downgrades and cancellation** — as above (D10–D12).
7. **Refunds** — policy undecided (D16).
8. **Acceptable use** — no abuse, circumvention of quotas or resale without agreement.
9. **Uptime and service credits** — 99.9% target for Pro/Enterprise (D13); credit schedule undecided.
10. **Data and privacy** — retention of audio/job data and API keys; deletion on request (ties to D12).
11. **Support** — community (Free), email (Pro), priority/account manager (Enterprise).
12. **Termination** — either party may end; consequences for access and data (D12).
13. **Changes to these terms** — notice period undecided.

## Out of scope

- No payment provider is added or approved by this document. Stripe (or any alternative) is D1.
- No payment, subscription or billing code is written here.
- The live pricing page remains the customer-facing source of truth until Nate settles D1–D17; copy
  and this document should be reconciled at that point.
