// The privacy notice (EPSILON-99, shared decision 0012) and its release gate.
// The notice must describe what the code actually does; facts only Nate can give are marked
// TODO(privacy), and a production build refuses to publish while any remain. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findGaps, assertNoGaps, isRelease } from "../scripts/release-gaps.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(join(root, rel), "utf8");
const notice = await read("src/pages/privacy.html");
const build = await read("scripts/build.mjs");
const session = await read("console/src/lib/session.ts");
const text = notice.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("the site footer links the notice", () => {
  assert.match(build, /<a href="\/privacy\/">Privacy<\/a>/);
});

test("the console links the notice on the auth screens and in the shell", async () => {
  for (const file of ["console/src/lib/components/AuthCard.svelte", "console/src/lib/components/SideNav.svelte"]) {
    assert.match(await read(file), /href="https:\/\/audiokit\.ai\/privacy\/"/, file);
  }
});

test("it names every provider that handles personal data", () => {
  for (const name of ["Railway", "Modal", "Netlify", "Stripe", "Sentry", "Resend", "Google Fonts", "Cloudflare Web Analytics"]) {
    assert.ok(text.includes(name), name);
  }
});

test("it has the sections a notice needs", () => {
  for (const id of ["controller", "bases", "providers", "transfers", "retention", "rights"]) {
    assert.match(notice, new RegExp(`<h2 id="${id}"`), id);
  }
});

test("device storage it describes matches the code", () => {
  // Console session cookie: name and lifetime.
  const cookie = /SESSION_COOKIE = '([^']+)'/.exec(session)[1];
  assert.ok(text.includes(cookie), `notice names the ${cookie} cookie`);
  assert.match(session, /SESSION_MAX_AGE_SECONDS = 60 \* 60 \* 8;/);
  assert.match(text, /expires after 8 hours/);
  // The signup source stores nothing on the device (decisions 0040 and 0041, EPSILON-98).
  assert.match(text, /Nothing is stored on your device for this: no cookie and no browser storage/);
  assert.doesNotMatch(text, /sessionStorage|localStorage|ak_first_touch/);
  assert.match(text, /The public site sets no cookies/);
});

test("it describes the first-touch signup source billing stores (decision 0040)", () => {
  for (const s of ["host name only", "utm_", "landing", "set once, when the account is created"]) {
    assert.ok(text.includes(s), s);
  }
});

test("no client is named on the public page", () => {
  assert.doesNotMatch(notice, /\bERMS\b|Epsilon Records Management/i);
});

test("gaps are found, and refused only in a release build", () => {
  const html = '<p><mark class="gap">TODO(privacy): the controller</mark> and <mark class="gap">TODO(privacy): a contact</mark></p>';
  assert.deepEqual(findGaps(html), ["the controller", "a contact"]);
  assert.doesNotThrow(() => assertNoGaps(new Map([["/privacy/", html]]), false));
  assert.throws(() => assertNoGaps(new Map([["/privacy/", html]]), true), /2 fact\(s\) still missing/);
  assert.doesNotThrow(() => assertNoGaps(new Map([["/privacy/", "<p>complete</p>"]]), true));
  assert.equal(isRelease({ CONTEXT: "production" }, []), true);
  assert.equal(isRelease({ CONTEXT: "deploy-preview" }, []), false);
  assert.equal(isRelease({}, ["node", "build", "--release"]), true);
  assert.equal(isRelease({}, []), false);
});

test("every gap in the notice is a visible, marked placeholder", () => {
  const marked = [...notice.matchAll(/<mark class="gap">TODO\(privacy\):[^<]+<\/mark>/g)].length;
  assert.equal(marked, findGaps(notice).length, "each TODO(privacy) sits in a <mark class=\"gap\">");
});

test("a production build refuses to publish while the notice has gaps", async () => {
  const gaps = findGaps(notice);
  const run = promisify(execFile)(process.execPath, ["scripts/build.mjs"], {
    cwd: root,
    env: { ...process.env, CONTEXT: "production" },
  });
  if (gaps.length) {
    await assert.rejects(run, (err) => /release build refused/.test(err.stderr));
  } else {
    await run;
  }
});
