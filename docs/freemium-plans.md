# AudioKit freemium plans

> **Superseded by [audiokit 0052](https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0052-prepaid-credits.md) (prepaid credits).**
> The public [pricing page](../src/pages/pricing.html) now states credits, not these plans. This
> document still describes what the legacy console shows until it is retired (audiokit 0053).

**Status: approved — [audiokit 0023](../../knowledge/audiokit/decisions/0023-freemium-plans-and-prices.md), [audiokit 0024](../../knowledge/audiokit/decisions/0024-no-free-trial.md).**
This document defines the Free, Pro and Enterprise plans that back the
[pricing page](../src/pages/pricing.html). It exists so the plan rules, quotas, overage handling and
upgrade/downgrade/cancellation behaviour are written down in one place.

Prices, quotas, the payment vendor and the quota unit are settled by decision 0023 (Nate, 2026-11-06).
Decision 0024 settles that paid plans have no trial; the Free plan remains the way to try AudioKit.
Anything still marked **Decision needed** is genuinely open; do not treat it as approved.

- Draft date: 2026-11-06; reconciled with 0023 on 2026-11-07
- Owner: product (Nate)
- Related: pricing page, Linear EPSILON-44

## Decisions needed from Nate

These block a real billing implementation (EPSILON-44). Each is a product/pricing decision, not an
engineering one.

| # | Decision | Settled value | Notes |
| --- | --- | --- | --- |
| D1 | Payment vendor | **Stripe** (0023, 0015) | Account region (EU vs US) still open |
| D2 | Pro price | `$99/month` or `$990/year` | Settled |
| D3 | Pro overage rate | `$0.15/stem`, `$0.01/other job` | Settled; billed as invoice items at period close |
| D4 | Pro overage behaviour | Allow overages and bill them | Settled |
| D5 | Free plan quota | `100 jobs/month`, of which `≤10 stems`, hard limit | Settled |
| D6 | Enterprise quota | `5,000 jobs/month`, of which `1,500 stems` | Settled |
| D7 | Enterprise price | from `$499/month`, annual and invoiced | Settled; volume overage ~`$0.08/stem` |
| D9 | Billing period anchor | Calendar month | **Open** |
| D10 | Upgrade timing | Takes effect next billing cycle | **Open** |
| D11 | Downgrade timing and over-limit rule | Next billing cycle | **Open** |
| D12 | Cancellation | Tier and keys kept until `current_period_end` | Settled; data retention window still open |
| D13 | SLA credits | 99.9% target for Pro/Enterprise | **Open** |
| D14 | Non-profit / education discount | Offered (per pricing FAQ) | **Open** |
| D15 | Currency and tax | USD; **Stripe Tax enabled** | Settled |
| D16 | Refunds | Undecided | **Open** |
| D17 | What counts as a job | One accepted operation on one input file, per distinct `job_id` per period; an idempotent replay is not re-counted; stems are a separate sub-cap | Settled |

## Plans at a glance

Prices and rates below are settled by decision 0023.

| | Free | Pro | Enterprise |
| --- | --- | --- | --- |
| Price | $0/month | $99/month or $990/year | from $499/month, annual and invoiced |
| Monthly job quota | 100, hard limit | 1,000 | 5,000 |
| Stem sub-cap | 10 | 250 | 1,500 |
| Over quota | Processing stops until next cycle or upgrade | $0.15/stem and $0.01/other job, invoiced at period close; a stem is billed once | Volume rate (~$0.08/stem) |
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
- **Quota:** 100 jobs per billing period, a hard limit, of which at most 10 may be stem separations.
- **Included:** all analysis and processing operations, webhook delivery, HMAC-signed webhooks,
  community support. No credit card required.
- **Over quota:** job submissions are rejected with `429 Too Many Requests` (error
  `quota_exceeded`) until the next billing period or an upgrade. No overages are incurred on Free.
- **Purpose:** evaluation and small projects; the Free plan is how customers try AudioKit.

### Pro

- **Price:** $99/month or $990/year, billed by card.
- **Quota:** 1,000 jobs per billing period, of which at most 250 may be stem separations.
- **Included:** everything on Free, plus priority processing, email support and a 99.9% uptime SLA
  (D13).
- **Over quota:** overages are allowed and billed at $0.15/stem and $0.01/other job, as invoice items
  at period close. A stem over the sub-cap is billed at the stem rate only (0027), never at both.
  Free plan (over quota) has no equivalent.
- **Purpose:** production use by small teams.

### Enterprise

- **Price:** from $499/month, annual and invoiced.
- **Quota:** 5,000 jobs per billing period, of which at most 1,500 may be stem separations; volume
  overage at roughly $0.08/stem.
- **Included:** everything on Pro, plus dedicated infrastructure, custom integrations, priority
  support, custom SLAs, volume discounts and a dedicated account manager.
- **Billing:** contract; invoice or bank transfer.
- **Purpose:** large-scale operations.

## What counts as a job

Settled by 0023 (D17). A job is **one accepted operation on one input file** — e.g. an analysis,
transcode or fingerprint request — regardless of file size or processing time.

- Counted **per distinct `job_id` per billing period**. An idempotent replay (HTTP 200 on a repeated
  `client_job_id`) is **not** re-counted.
- **Stems are a separate sub-cap**, not weighted credits: a stem separation counts as one job *and*
  one stem, and each plan caps stems independently. This is because a stem job costs ~$0.03–0.06 of
  GPU time (0022) while a CPU job is near-free.
- Still open: whether a job that fails or is canceled after acceptance counts toward the quota.

## Quotas and enforcement

- Usage is counted **per account, per billing period**. The period anchor is undecided (D9);
  calendar month is the draft.
- Enforcement happens before a job is accepted, so a rejected submission does not consume quota.
- **Free:** reject when the quota is reached (HTTP 429, `quota_exceeded`).
- **Pro:** accept over the quota and record the overage for billing.
- **Enterprise:** 5,000 jobs and 1,500 stems per period, with volume overage per the agreement.
- The console/API should expose current usage, quota remaining and overage count so customers are
  not surprised. Quota-warning notifications are part of the eventual implementation, not this doc.

## Overage rules

- Overage only exists on paid plans (D4). The rate is $0.15/stem and $0.01/other job on Pro (D3).
- **No unit is charged twice** (0027). A stem uses one slot from each allowance, so excess stems are
  removed from the job overage before it is billed: on Pro, 300 stems plus 900 other jobs is
  `50 × $0.15 + 150 × $0.01`, not `200 × $0.01 + 50 × $0.15`. The marketing page must not phrase the
  two rates in a way that invites the addition.
- Overage is metered per billing period and billed as **invoice items at period close** — not metered
  billing (0023).
- Free plan: no overages — hard stop instead.
- Enterprise: handled in the custom agreement.
- Overage is only charged for jobs the service accepted — settled (D17, decision 0023): a job is
  one accepted operation on one input file, counted per distinct `job_id` per period, and an
  idempotent replay is not re-counted.

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
5. **Upgrades, downgrades and cancellation** — as above (D10–D12).
6. **Refunds** — policy undecided (D16).
7. **Acceptable use** — no abuse, circumvention of quotas or resale without agreement.
8. **Uptime and service credits** — 99.9% target for Pro/Enterprise (D13); credit schedule undecided.
9. **Data and privacy** — retention of audio/job data and API keys; deletion on request (ties to D12).
10. **Support** — community (Free), email (Pro), priority/account manager (Enterprise).
11. **Termination** — either party may end; consequences for access and data (D12).
12. **Changes to these terms** — notice period undecided.

## Out of scope

- No payment, subscription or billing code is written here; that is EPSILON-44 in
  `epsilon-records/epsilon-billing`.
- The live pricing page and this document are reconciled with decisions 0023 and 0024. If they drift,
  those decisions win.
