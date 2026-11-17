// The terms page (audiokit-web#78) is a DRAFT: Nate approves the text before it ships (shared 0012).
// Every clause nobody has decided is a visible <mark class="gap">[OPEN: …]</mark>, and a production
// build refuses to publish while any is left. Settled clauses follow AudioKit decisions 0052, 0057,
// 0063, 0072, 0074, 0081, 0082 and 0085 and shared decision 0040. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findGaps } from "../scripts/release-gaps.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(join(root, rel), "utf8");
const page = await read("src/pages/terms.html");
const build = await read("scripts/build.mjs");
const text = page.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("the site footer links the terms", () => {
  assert.match(build, /<a href="\/terms\/">Terms<\/a>/);
});

test("it has the sections terms need", () => {
  for (const id of ["who", "service", "account", "audio", "credits", "refunds", "use", "ip", "availability", "liability", "ending", "changes", "law", "notices"]) {
    assert.match(page, new RegExp(`<h2 id="${id}"`), id);
  }
});

test("every undecided clause is a visible, marked [OPEN: …] placeholder", () => {
  const marked = [...page.matchAll(/<mark class="gap">\[OPEN:[^\]<]+\]<\/mark>/g)].length;
  assert.ok(marked > 0, "a draft has open points");
  assert.equal(marked, findGaps(page).length, "each [OPEN: …] sits in a <mark class=\"gap\">");
  const gaps = findGaps(page).join(" | ").toLowerCase();
  for (const topic of ["effective date", "has not approved", "counsel", "api contract", "warranty disclaimer"]) {
    assert.match(gaps, new RegExp(topic), topic);
  }
});

test("the release gate sees [OPEN: …] markers as gaps", () => {
  assert.deepEqual(findGaps('<mark class="gap">[OPEN: governing law]</mark>'), ["governing law"]);
  assert.deepEqual(findGaps('<mark class="gap">TODO(privacy): a contact</mark>'), ["a contact"]);
});

test("refunds follow 0057 and 0082", () => {
  assert.match(text, /Credit packs are non-refundable\./);
  assert.match(text, /refunded, or you dispute it[^]*?remove that pack's unspent credits[^]*?never goes below zero/);
});

test("credits follow 0052, 0063, 0072 and 0074", () => {
  assert.match(text, /Credits you buy do not expire\./);
  assert.match(text, /Unspent free credits lapse at the end of the month/);
  assert.match(text, /monthly free credits first, then purchased credits[^]*?then any credits we have granted/);
  assert.match(text, /No negative balance/);
  assert.doesNotMatch(text, /expire[^.]*12 months|below zero; new jobs|\brepaid/i, "no expiry or debt language that decisions 0072 and 0074 removed");
});

test("it copies no price or rate: the pricing page is the source", () => {
  assert.match(page, /href="\/pricing\/"/);
  assert.doesNotMatch(text, /\$\s?\d|\b\d[\d,]* credits\b|per audio minute/);
});

test("no uptime promise (shared 0040) and no subscription plans (0052)", () => {
  assert.doesNotMatch(text, /99\.9|\bPro\b|\bEnterprise\b/);
  assert.match(text, /no service-level agreement/);
});

test("SDKs are MIT and the contract is not licensed away (0081)", () => {
  assert.match(text, /SDKs\) are licensed under the MIT licence/);
});

test("it names the seller and the address from the privacy notice (0085 point 1)", () => {
  assert.match(text, /run by Epsilon Records LLC, a company registered in Nevada/);
  assert.match(text, /Nieuwe Uilenburgerstraat 21C, 1011LM Amsterdam/);
});

test("it states the decisions of 0085", () => {
  assert.match(text, /governed by the law of Nevada[^]*?courts of Nevada[^]*?EU[^]*?mandatory protections/);
  assert.match(text, /agree that the service starts at once[^]*?lose that right once you have used the credits/);
  assert.match(text, /limited to the fees you paid us in the 12 months[^]*?does not apply to liability that the law does not allow/);
  assert.match(text, /Unspent credits are forfeited[^]*?warns you before you confirm/);
  assert.match(text, /30 days' notice before a breaking change[^]*?at least 30 days before it takes effect/);
  assert.match(text, /no promise of support until we publish a support address/);
  assert.match(text, /including a time-out, is not charged/);
  for (const rule of ["unlawful or that you do not have the rights to", "get around limits", "probe the service for weaknesses", "resell access"]) assert.ok(text.includes(rule), rule);
});

test("it links the privacy notice, publishes no mailbox and names no client", () => {
  assert.match(page, /href="\/privacy\/#controller"/);
  assert.doesNotMatch(page, /mailto:/i);
  assert.doesNotMatch(page, /\bERMS\b|LabelKit|Epsilon Records Management/i);
});
