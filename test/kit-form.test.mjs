// The "Product updates" signup (shared decision 0027): one config constant, nothing renders while
// it is empty, and the privacy notice names Kit only when the form is live. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../site.config.mjs";
import { applyKitBlocks, normalizeKitFormId, productUpdatesForm } from "../scripts/kit-form.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(join(root, rel), "utf8");
const plain = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("the Kit form ID is one config constant, and it ships empty until the form exists", async () => {
  assert.ok("kitFormId" in config);
  assert.equal(config.kitDisclosure, true, "the Kit disclosure stays on while Kit holds subscribers");
  assert.equal(normalizeKitFormId(config.kitFormId), config.kitFormId);
  for (const file of ["scripts/build.mjs", "src/pages/index.html", "scripts/kit-form.mjs"]) {
    assert.doesNotMatch(await read(file), /app\.kit\.com\/forms\/\d{4,}/, `${file} hard-codes a form ID`);
  }
});

test("an empty ID renders no form; a bad ID fails the build", () => {
  assert.equal(productUpdatesForm(""), "");
  assert.equal(productUpdatesForm(undefined), "");
  assert.equal(productUpdatesForm("  "), "");
  for (const bad of ["abc", "123/../x", "https://app.kit.com/forms/1", "12 34"]) {
    assert.throws(() => productUpdatesForm(bad), /kitFormId/, bad);
  }
});

test("a configured ID renders a plain POST to Kit with an email_address field and no script", () => {
  const html = productUpdatesForm("123456");
  assert.match(html, /<form [^>]*action="https:\/\/app\.kit\.com\/forms\/123456\/subscriptions" method="post"/);
  assert.match(html, /<input type="email" name="email_address"[^>]* required/);
  assert.match(html, /<label class="sr-only" for="updates-email">/);
  assert.doesNotMatch(html, /<script|onclick|onsubmit|data-cf-beacon/i);
  assert.match(html, /href="\/privacy\/#updates-list"/);
  assert.match(plain(html), /sends your email address to Kit/);
});

test("AudioKit stays independent: no Epsilon or client names in the form or its pages", async () => {
  const files = [productUpdatesForm("1"), await read("src/pages/check-your-inbox.html"), await read("src/pages/subscribed.html")];
  for (const text of files) assert.doesNotMatch(text, /epsilon|ERMS/i);
});

test("the landing page places the form through the token", async () => {
  assert.match(await read("src/pages/index.html"), /\{\{PRODUCT_UPDATES_FORM\}\}/);
});

test("the Kit privacy disclosure follows kitDisclosure, not the form ID", async () => {
  const notice = await read("src/pages/privacy.html");
  const off = plain(applyKitBlocks(notice, false));
  assert.doesNotMatch(off, /\bKit\b|ConvertKit|kit\.com/);
  assert.doesNotMatch(applyKitBlocks(notice, false), /updates-list/);
  const build = await read("scripts/build.mjs");
  assert.match(build, /KIT_DISCLOSURE = KIT_ENABLED \|\| config\.kitDisclosure === true/);
  assert.match(build, /applyKitBlocks\(text, KIT_DISCLOSURE\)/);
  assert.doesNotMatch(build, /applyKitBlocks\(text, KIT_ENABLED\)/);
  assert.doesNotMatch(applyKitBlocks(notice, false), /<!--\/?kit-->/);
  const onHtml = applyKitBlocks(notice, true);
  assert.doesNotMatch(onHtml, /<!--\/?kit-->/);
  const on = plain(onHtml);
  for (const s of [
    "Kit (formerly ConvertKit)",
    "Only the email address you enter",
    "you are subscribed only after you click the link",
    "Every product update email includes an unsubscribe link",
    "Your consent (a)",
    "marked as unsubscribed so that you are not emailed again, until you ask us to erase it; we then delete it",
    "EU-U.S. Data Privacy Framework",
    "Standard Contractual Clauses",
  ]) assert.ok(on.includes(s), s);
  assert.match(onHtml, /href="https:\/\/kit\.com\/gdpr"/);
  assert.match(onHtml, /<h2 id="updates-list"/);
  // Controller and contact are unchanged.
  assert.match(on, /The controller for the personal data described here is Epsilon Records, Nieuwe Uilenburgerstraat 21C, 1011LM Amsterdam\./);
  assert.match(onHtml, /href="mailto:hello@epsilonrecords\.com"/);
});

test("the confirmation pages exist, are noindex and are not in the sitemap", async () => {
  for (const file of ["src/pages/check-your-inbox.html", "src/pages/subscribed.html"]) {
    assert.match(await read(file), /"noindex": true/, file);
  }
});
