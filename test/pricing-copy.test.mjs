// The pricing page states prepaid credits and nothing else.
// AudioKit decision 0052: credits replace the Pro and Enterprise subscriptions (supersedes 0023,
// 0024 and 0027). 1 credit = $0.01; Free 100 credits a month; packs $10/1,000, $50/5,500,
// $200/24,000, valid 12 months; per-operation rates below.
// AudioKit decision 0057: packs are non-refundable.
// Shared decision 0040: no AudioKit sales until credits ship, and no uptime SLA claim. So the page
// shows pack prices with an "opens soon" note and no way to buy one.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pricingFindings } from "./acceptance/lib.mjs";

const html = await readFile(new URL("../src/pages/pricing.html", import.meta.url), "utf8");

const text = html
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&mdash;/g, "—")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

test("passes the acceptance probe's pricing checks (shared 0040, AudioKit 0052)", () => {
  const f = pricingFindings(html);
  assert.equal(f.sells_pro_99, false, "the page must not sell Pro at $99");
  assert.equal(f.uptime_sla_claim, false, "the 99.9% uptime SLA claim must stay off");
  assert.equal(f.mentions_credits, true, "the page must show prepaid credits");
  assert.equal(f.pack_10_for_1000, true, "the $10 / 1,000 credits pack must be shown");
  assert.equal(f.mailto_links, 0, "no unpublished mailbox");
});

test("no subscription plan, SLA or discount is offered", () => {
  assert.doesNotMatch(text, /\bPro\b/, "Pro is gone (0052)");
  assert.doesNotMatch(text, /\bEnterprise\b/, "Enterprise subscriptions are gone (0052)");
  assert.doesNotMatch(text, /\bSLA\b|uptime/i, "no uptime claim until uptime is measured (shared 0040)");
  assert.doesNotMatch(text, /overage|\$0\.15|\$990|\$499/, "no subscription overage or price is left");
  assert.doesNotMatch(text, /discount|special pricing/i, "list price only during the beta (shared 0040)");
});

test("states the credit price, the Free allowance and every pack from 0052", () => {
  assert.match(text, /One credit is \$0\.01/);
  assert.match(text, /100 credits each calendar month \(UTC\)/);
  assert.match(text, /lapse at the end of/);
  for (const [price, credits] of [["$10", "1,000"], ["$50", "5,500"], ["$200", "24,000"]]) {
    assert.ok(text.includes(`${price} for ${credits} credits`), `missing the ${price} pack (${credits} credits)`);
  }
  assert.match(text, /valid for 12 months after/);
});

test("states every rate from 0052", () => {
  assert.match(text, /probe , loudness , waveform , tempo , key , fingerprint , tags 1 per track/);
  assert.match(text, /analyze bundle 3 per track/);
  assert.match(text, /stems 3 per audio minute, metered per second, at least 10 per job/);
  assert.match(text, /transcode , preview , normalize 1 per audio minute/);
});

test("says packs are non-refundable (0057)", () => {
  assert.match(text, /non-refundable/);
});

test("nothing can be bought yet, and Free sign-up still works (shared 0040)", () => {
  assert.match(text, /Credit packs open soon/);
  assert.doesNotMatch(html, /checkout/i, "no purchase link or button while credits are not spendable");
  const packCard = html.slice(html.indexOf("<h2>Credit packs</h2>"), html.indexOf("</article>", html.indexOf("<h2>Credit packs</h2>")));
  assert.doesNotMatch(packCard, /<a\b|<button\b|<form\b/, "the pack card carries no link, button or form");
  assert.match(html, /href="\{\{CONSOLE_SIGNUP\}\}">Start free</, "the Free sign-up CTA stays");
});
