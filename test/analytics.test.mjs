import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import config from '../site.config.mjs';

const source = await readFile(new URL('../src/static/analytics.js', import.meta.url), 'utf8');
const safe = 'https://audiokit.ai/';
const token = 'a'.repeat(32); // Test-only fixture; never a configured/shipped tracker.
function run({ current = safe, original = safe, referrer = '', id = token, entries, duplicate = false } = {}) {
  const scripts = [];
  const context = vm.createContext({ URL, location: { href: current },
    performance: { getEntriesByType: () => entries ?? [{ name: original }] }, window: {},
    document: { currentScript: { dataset: { siteToken: id } }, referrer,
      querySelector: () => duplicate, createElement: () => ({ setAttribute(k, v) { this[k] = v; } }),
      head: { append: (s) => scripts.push(s) } },
  });
  vm.runInContext(source, context);
  vm.runInContext(source, context);
  return scripts;
}
test('missing real configuration stays disabled', () => {
  assert.ok(config.cloudflareWebAnalyticsToken === '' || /^[a-f0-9]{32}$/i.test(config.cloudflareWebAnalyticsToken));
  for (const id of ['', null, 'UNKNOWN', 'example']) assert.equal(run({ id }).length, 0);
});
test('clean public documents load exactly once with document-only metrics', () => {
  const [beacon] = run();
  assert.equal(run().length, 1);
  assert.equal(beacon.referrerPolicy, 'no-referrer');
  assert.deepEqual(JSON.parse(beacon['data-cf-beacon']), { token, spa: false });
  assert.equal(run({ duplicate: true }).length, 0);
});
test('current, original navigation and referrer all fail closed', () => {
  const unsafe = [safe + '?token=FABRICATED_SECRET', safe + '#FABRICATED_SECRET', safe + '?', safe + '#',
    'https://audiokit.ai/auth/callback', 'https://audiokit.ai/login', 'https://audiokit.ai/billing/',
    'https://audiokit.ai/search/', 'https://audiokit.ai/catalog/FABRICATED_SECRET',
    'https://audiokit.ai/docs/unknown/', 'https://audiokit.ai/%61uth/', 'not a URL'];
  for (const url of unsafe) for (const key of ['current', 'original', 'referrer']) {
    assert.equal(run({ [key]: url }).length, 0, `${key}: ${url}`);
  }
  for (const host of ['console.audiokit.ai', 'api.audiokit.ai', 'billing.audiokit.ai', 'preview.netlify.app', 'www.audiokit.ai', 'localhost']) {
    assert.equal(run({ current: `https://${host}/` }).length, 0);
    assert.equal(run({ original: `https://${host}/` }).length, 0);
  }
  for (const entries of [[], [{ name: safe }, { name: safe }], [{}]]) assert.equal(run({ entries }).length, 0);
  assert.equal(run({ referrer: null }).length, 0);
});
