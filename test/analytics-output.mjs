// Run after the static build. This checks generated output without changing it.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { analyticsToken } from '../scripts/analytics-config.mjs';
// Same environment as the build that produced dist/: enabled only with the variable and CONTEXT=production.
const token = analyticsToken();
const root = new URL('../dist/', import.meta.url);
async function htmlFiles(dir = root) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) result.push(...await htmlFiles(file));
    else if (entry.name.endsWith('.html')) result.push(file);
  }
  return result;
}
const files = await htmlFiles();
assert.equal(files.length, 10, 'review public route inventory when adding pages');
let loaders = 0;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  assert.match(html, /href="\/privacy\/"/);
  assert.doesNotMatch(html, /\{\{ANALYTICS_STATUS\}\}|data-cf-beacon|static\.cloudflareinsights\.com/);
  const tags = [...html.matchAll(/<script src="\/analytics.js" data-site-token="([^"]+)" defer><\/script>/g)];
  const enabled = token !== '';
  // noindex pages (404 and the two newsletter confirmation pages) never load the beacon.
  const noindex = /\/(404\.html|check-your-inbox\/index\.html|subscribed\/index\.html)$/.test(file.pathname);
  const expected = enabled && !noindex ? 1 : 0;
  assert.equal(tags.length, expected, file.pathname);
  for (const tag of tags) assert.equal(tag[1], token);
  loaders += tags.length;
  if (process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN) assert.match(html, /<script src="\/sentry-init.js"><\/script>/);
}
if (process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN) {
  assert.match(await readFile(new URL('sentry-init.js', root), 'utf8'), /^Sentry\.init\(/);
}
assert.equal(await stat(new URL('privacy.html', root)).then(() => true, () => false), false);
assert.match(await readFile(new URL('privacy/index.html', root), 'utf8'), token
  ? /We use Cloudflare Web Analytics/ : /Cloudflare Web Analytics is currently disabled/);
console.log(`PASS ${files.length} public HTML documents: ${loaders} guarded loaders, no direct vendor injection, privacy links and conditional Sentry preserved`);
