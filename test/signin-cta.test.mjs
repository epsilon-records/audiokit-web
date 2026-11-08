// Every sign-in CTA on the public site points at the console's login screen, and the early-access
// "Request access" form stays gone.
// The console is a sibling app on its own Netlify site at console.audiokit.ai (AudioKit decisions
// 0016 and 0021), so the site can only reach it with an absolute link, built from site.config.mjs.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../site.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGIN = `${config.consoleUrl}/login`;

const read = (rel) => readFile(join(root, rel), "utf8");
const exists = (rel) => stat(join(root, rel)).then(() => true, () => false);

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const p = join(dir, entry.name);
    files.push(...(entry.isDirectory() ? await walk(p) : [p]));
  }
  return files;
}

const pageFiles = await walk("src/pages");
const pages = await Promise.all(pageFiles.map(read));
const allPages = pages.join("\n");
const build = await read("scripts/build.mjs");

test("the console login URL is the live console's sign-in screen", async () => {
  // Decision 0021: the console deploys at console.audiokit.ai, and /login is its only way in, so a
  // CTA pointing anywhere else is a dead end for a customer.
  assert.equal(config.consoleUrl, "https://console.audiokit.ai");
  assert.equal(new URL(LOGIN).pathname, "/login");
  assert.ok(
    await exists("console/src/routes/login/+page.svelte"),
    "console/src/routes/login/+page.svelte is the link target",
  );
});

test("the header's CTA signs in to the console", () => {
  assert.match(build, /const CONSOLE_LOGIN = `\$\{config\.consoleUrl\}\/login`;/);
  assert.match(
    build,
    /href="\$\{CONSOLE_LOGIN\}">Sign in</,
    "the header button should be a 'Sign in' link built from the console URL",
  );
});

test("pages link the console through a token, never a hardcoded origin", () => {
  assert.ok(allPages.includes("{{CONSOLE_LOGIN}}"), "pages should use {{CONSOLE_LOGIN}}");
  assert.doesNotMatch(
    allPages,
    /console\.audiokit\.ai/,
    "the console's origin lives in site.config.mjs, not in a page",
  );
});

test("no request-access form, link or copy is left behind", async () => {
  assert.doesNotMatch(allPages + build, /Request( an?| API)? access/i);
  assert.doesNotMatch(allPages + build, /#access/, "the removed section was /#access");
  assert.ok(!(await exists("src/pages/thanks.html")), "the form's destination page is gone");
  assert.ok(!(await exists("netlify/functions")), "with no form, the site builds no function");
});

test("no unpublished mailbox is advertised", () => {
  // sales@audiokit.ai does not exist yet, so linking it would mail a customer's question into a
  // void. The Enterprise card and the FAQ state the plan without a contact link until an address
  // is set up and shown to receive. Ask on the board before adding one back.
  assert.doesNotMatch(allPages, /mailto:/i, "pages must not advertise an address that cannot receive");
  assert.doesNotMatch(allPages, /contact (us|sales)/i, "there is no contact channel to point at");
});
