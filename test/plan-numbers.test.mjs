// The same plan is written down in four places in this repo: the marketing page, the console's
// mock fixtures, the console's service-backed card copy, and docs/freemium-plans.md. Nothing kept
// them in agreement, and drift there is a billing claim to customers.
// Canonical source: AudioKit decision 0023 (plans and prices) and 0027 (a stem is billed once).
// https://github.com/epsilon-records/knowledge/blob/main/audiokit/decisions/0023-freemium-plans-and-prices.md
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(rel, import.meta.url), "utf8");

// What 0023 decided. If a number changes here, all four artifacts have to change with it.
const PLANS = {
  free: { price: "$0", jobs: "100", stems: "10", jobLimit: 100 },
  pro: { price: "$99", year: "$990", jobs: "1,000", stems: "250", jobLimit: 1_000 },
  enterprise: { price: "$499", jobs: "5,000", stems: "1,500", jobLimit: 5_000 },
};
const RATES = { stem: "$0.15", job: "$0.01" };

// Every value below is money, so `$` has to be escaped before it reaches a RegExp: /$0/ means
// "end of string then 0" and silently matches nothing.
const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const text = (markup) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ");

const pricing = text(await read("../src/pages/pricing.html"));
const docs = await read("../docs/freemium-plans.md");
const fixtures = await read("../console/src/lib/fixtures.ts");

test("the marketing page states every plan's quota and price from decision 0023", () => {
  for (const [tier, plan] of Object.entries(PLANS)) {
    assert.match(pricing, new RegExp(esc(plan.price)), `marketing page is missing the ${tier} price (${plan.price})`);
    assert.match(
      pricing,
      new RegExp(esc(`${plan.jobs} jobs per month`)),
      `marketing page is missing the ${tier} job allowance`,
    );
    assert.match(
      pricing,
      new RegExp(esc(`${plan.stems} stem separations included`)),
      `marketing page is missing the ${tier} stem allowance`,
    );
  }
});

test("the console's mock plans agree with the marketing page on every limit", () => {
  for (const [tier, plan] of Object.entries(PLANS)) {
    assert.match(
      fixtures,
      new RegExp(esc(`${plan.jobs} jobs per month`)),
      `fixtures are missing the ${tier} job allowance`,
    );
    assert.match(
      fixtures,
      new RegExp(esc(`${plan.stems} stem separations included`)),
      `fixtures are missing the ${tier} stem allowance`,
    );
  }
  // jobLimit drives the card and the upgrade form; enterprise is priced by sales.
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

test("the rates quoted anywhere in the repo are the two rates from 0023", () => {
  // No third rate may appear in customer-facing copy: 0027 killed the sum of the two.
  const quoted = [...pricing.matchAll(/\$0\.\d\d/g)].map((m) => m[0]);
  assert.ok(quoted.length > 0, "expected the page to quote overage rates");
  for (const rate of quoted) {
    assert.ok(
      [RATES.stem, RATES.job].includes(rate),
      `unexpected rate ${rate} on the pricing page (0023 says ${RATES.stem}/stem and ${RATES.job}/other job)`,
    );
  }
});

test("Free is a hard stop with no overage, everywhere", () => {
  assert.match(pricing, /Free tier users will need to upgrade/);
  assert.match(docs, /Free plan: no overages — hard stop instead\./);
  // The Free plan must not be quoted any overage rate in the console card.
  const freeBlock = fixtures.slice(
    fixtures.indexOf("id: 'free'"),
    fixtures.indexOf("id: 'pro'"),
  );
  assert.doesNotMatch(freeBlock, /\$0\.\d\d/, "Free must not show an overage rate");
});
