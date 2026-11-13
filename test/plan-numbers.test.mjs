// The legacy subscription plans are written down in three places in this repo: the console's
// mock fixtures, the console's service-backed card copy, and docs/freemium-plans.md. Nothing kept
// them in agreement, and drift there is a billing claim to customers.
// Source: AudioKit decision 0023 (plans and prices) and 0027 (a stem is billed once). Both are
// superseded by 0052 (prepaid credits); the marketing page now states credits and is checked by
// test/pricing-copy.test.mjs. The console is retired by 0053 (EPSILON-169), so these checks go
// with it.
// https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0023-freemium-plans-and-prices.md
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(rel, import.meta.url), "utf8");

// What 0023 decided. If a number changes here, all three artifacts have to change with it.
const PLANS = {
  free: { price: "$0", jobs: "100", stems: "10", jobLimit: 100 },
  pro: { price: "$99", year: "$990", jobs: "1,000", stems: "250", jobLimit: 1_000 },
  enterprise: { price: "$499", jobs: "5,000", stems: "1,500", jobLimit: 5_000 },
};

// Every value below is money, so `$` has to be escaped before it reaches a RegExp: /$0/ means
// "end of string then 0" and silently matches nothing.
const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const docs = await read("../docs/freemium-plans.md");
const fixtures = await read("../console/src/lib/fixtures.ts");

test("the console's mock plans keep the stem allowances from 0023 and state Free in credits", () => {
  // Free is credits now (0052): no job or stem quota. The retired paid tiers keep their stem line
  // and no job line, because the decisions give no credit equivalent for a subscription allowance.
  assert.match(fixtures, /'100 credits \/ month'/, "fixtures are missing Free's monthly credits");
  assert.doesNotMatch(fixtures, /jobs per month/, "no fixture may state a job allowance");
  for (const tier of ["pro", "enterprise"]) {
    const plan = PLANS[tier];
    assert.match(
      fixtures,
      new RegExp(esc(`${plan.stems} stem separations included`)),
      `fixtures are missing the ${tier} stem allowance`,
    );
  }
  // jobLimit is no longer read by the plan card; the values stay pinned as the service's rows.
  assert.match(fixtures, /jobLimit: 100/);
  assert.match(fixtures, /jobLimit: 1_000/);
  assert.match(fixtures, /jobLimit: 5_000/);
  assert.match(fixtures, /priceMonthly: null/);
});

test("docs/freemium-plans.md agrees on prices, allowances and overage rates", () => {
  for (const plan of Object.values(PLANS)) {
    assert.match(docs, new RegExp(esc(plan.price)), `docs are missing a price (${plan.price})`);
    assert.match(docs, new RegExp(esc(plan.jobs) + "\\b"), `docs are missing an allowance (${plan.jobs})`);
    assert.match(docs, new RegExp(esc(plan.stems) + "\\b"), `docs are missing a stem allowance (${plan.stems})`);
  }
  assert.match(docs, /\$990\/year/, "docs lost the annual Pro price");
  assert.match(docs, /`\$0\.15\/stem`, `\$0\.01\/other job`/, "docs lost the Pro overage rates");
  assert.match(docs, /~`\$0\.08\/stem`/, "docs lost the Enterprise volume overage rate");
});

test("Free is a hard stop with no overage, in the docs and the console", () => {
  assert.match(docs, /Free plan: no overages — hard stop instead\./);
  // The Free plan must not be quoted any overage rate in the console card.
  const freeBlock = fixtures.slice(
    fixtures.indexOf("id: 'free'"),
    fixtures.indexOf("id: 'pro'"),
  );
  assert.doesNotMatch(freeBlock, /\$0\.\d\d/, "Free must not show an overage rate");
});
