// Run after the static build. Checks that the built pages fit the Content-Security-Policy in
// netlify.toml (EPSILON-118): no inline scripts, styles or event handlers, and every external
// script, stylesheet and form target is allowed by its directive.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../dist/', import.meta.url);
const toml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const header = /^\s*Content-Security-Policy = "([^"]+)"/m.exec(toml);
assert.ok(header, 'netlify.toml sets a Content-Security-Policy');
const csp = new Map(
  header[1].split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]),
);
for (const [name, value] of [['frame-ancestors', "'none'"], ['object-src', "'none'"], ['base-uri', "'self'"]]) {
  assert.deepEqual(csp.get(name), [value], name);
}
assert.match(toml, /Strict-Transport-Security = "max-age=31536000; includeSubDomains"/);

const allows = (directive, url) => {
  const sources = csp.get(directive) ?? csp.get('default-src');
  if (url.startsWith('/')) return sources.includes("'self'");
  return sources.includes(new URL(url).origin);
};

async function htmlFiles(dir = root) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) result.push(...(await htmlFiles(file)));
    else if (entry.name.endsWith('.html')) result.push(file);
  }
  return result;
}

const files = await htmlFiles();
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const where = file.pathname;
  for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
    // JSON-LD is a data block: never executed, so script-src does not apply. It must still parse.
    if (/\stype="application\/ld\+json"/.test(tag)) continue;
    const src = /\ssrc="([^"]+)"/.exec(tag)?.[1];
    assert.ok(src, `${where}: inline script ${tag}`);
    assert.ok(allows('script-src', src), `${where}: script-src does not allow ${src}`);
  }
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => JSON.parse(json), `${where}: JSON-LD does not parse`);
  }
  assert.doesNotMatch(html, /<style\b/, `${where}: inline <style>`);
  assert.doesNotMatch(html, /<[^>]+\sstyle="/, `${where}: inline style attribute`);
  assert.doesNotMatch(html, /<[^>]+\son[a-z]+="/, `${where}: inline event handler`);
  for (const [, a, b] of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"|<link[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g)) {
    const href = a ?? b;
    assert.ok(allows('style-src', href), `${where}: style-src does not allow ${href}`);
  }
  for (const [, action] of html.matchAll(/<form[^>]*\saction="([^"]+)"/g)) {
    assert.ok(allows('form-action', action), `${where}: form-action does not allow ${action}`);
  }
}

// Loaded at runtime rather than from the HTML.
assert.ok(allows('script-src', 'https://static.cloudflareinsights.com/beacon.min.js'));
assert.ok(allows('connect-src', 'https://cloudflareinsights.com/cdn-cgi/rum'));
assert.ok(allows('font-src', 'https://fonts.gstatic.com/s/x.woff2'));
const dsn = process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN;
if (dsn) assert.ok(allows('connect-src', `https://${new URL(dsn).host}/`), 'connect-src allows the Sentry ingest host');

console.log(`PASS ${files.length} public HTML documents fit the Content-Security-Policy`);
