// The terms page (audiokit-web#78) is a DRAFT: Nate approves the text before it ships (shared 0012).
// Every clause nobody has decided is a visible <mark class="gap">[OPEN: …]</mark>, and a production
// build refuses to publish while any is left. Settled clauses follow AudioKit decisions 0052, 0057,
// 0063, 0072, 0074, 0081 and 0082 and shared decision 0040. Run: npm test

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
  for (const topic of ["governing law", "liability cap", "acceptable-use|agent proposal", "legal entity", "effective date", "has not approved"]) {
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
  assert.doesNotMatch(text, /12 months|below zero; new jobs|\brepaid/i, "no expiry or debt language that decisions 0072 and 0074 removed");
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

test("it names the controller and address from the privacy notice, with no legal form", () => {
  assert.match(text, /Epsilon Records, Nieuwe Uilenburgerstraat 21C, 1011LM Amsterdam/);
  assert.doesNotMatch(text, /Epsilon Records (B\.V\.|BV|V\.O\.F|VOF|LLC|Ltd|Inc)/i);
});

test("it links the privacy notice, publishes no mailbox and names no client", () => {
  assert.match(page, /href="\/privacy\/#controller"/);
  assert.doesNotMatch(page, /mailto:/i);
  assert.doesNotMatch(page, /\bERMS\b|LabelKit|Epsilon Records Management/i);
});
