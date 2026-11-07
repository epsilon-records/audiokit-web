// The pricing page must not read as if a stem is charged twice.
// AudioKit decision 0023: stems are a sub-cap of the job allowance, so a stem uses a slot in both.
// AudioKit decision 0027: a stem over that sub-cap is billed at the stem rate ONLY.
// Counting twice is correct; charging twice is wrong, and the page used to imply the latter by
// putting "$0.01 per job" next to "$0.15 per stem" with no qualifier.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../src/pages/pricing.html", import.meta.url), "utf8");

const toText = (markup) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Prose blocks a customer reads as one unit: paragraphs, definition bodies, list items. */
const blocks = [...html.matchAll(/<(p|dd|li)\b[^>]*>([\s\S]*?)<\/\1>/g)]
  .map(([, , inner]) => toText(inner))
  .filter(Boolean);

const BILLED_ONCE = /once|only|never|does not also/;

test("states the Pro rates from decision 0023", () => {
  const text = blocks.join(" ");
  assert.match(text, /\$0\.15 per stem|\$0\.15 for each stem/, "the stem rate is published");
  assert.match(
    text,
    /\$0\.01 per other job|\$0\.01 for each other job/,
    "the job rate must be qualified as the *other* job rate",
  );
});

test("every block that quotes the stem rate says it is charged once", () => {
  const rateBlocks = blocks.filter((block) => block.includes("$0.15"));
  assert.ok(rateBlocks.length >= 2, "expected the rate to appear in both the copy and the FAQ");
  for (const block of rateBlocks) {
    assert.match(
      block,
      BILLED_ONCE,
      `a block quotes the stem rate without saying it is charged once: "${block}"`,
    );
  }
});

test("the block that counts a stem as a job also says it is charged once", () => {
  // Only the stem paragraph states the counting rule; the paragraph before it defines "a job".
  const counting = blocks.filter((block) => /one job and one stem/i.test(block));
  assert.equal(counting.length, 1, "the counting rule should be stated in exactly one place");
  assert.match(
    counting[0],
    BILLED_ONCE,
    `counting is stated without the charging rule: "${counting[0]}"`,
  );
});

test("never prices a stem at the sum of both rates", () => {
  const text = blocks.join(" ");
  assert.doesNotMatch(text, /\$0\.16/, "the page must not add the job rate to the stem rate");
});
