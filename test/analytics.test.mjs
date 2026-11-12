import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import config from '../site.config.mjs';
import { analyticsToken, TOKEN_VARIABLE } from '../scripts/analytics-config.mjs';

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
  assert.equal('cloudflareWebAnalyticsToken' in config, false, 'the token is not committed in site.config.mjs');
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

test('the token comes from the environment, in the production context only', () => {
  assert.equal(TOKEN_VARIABLE, 'PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN');
  const env = (extra) => ({ [TOKEN_VARIABLE]: token, ...extra });
  assert.equal(analyticsToken(env({ CONTEXT: 'production' })), token);
  assert.equal(analyticsToken(env({ CONTEXT: 'production', [TOKEN_VARIABLE]: ` ${token}\n` })), token);
  // Unset, empty or malformed: nothing loads, and nothing throws.
  for (const value of [undefined, '', 'short', 'z'.repeat(32), token + 'a', 'example']) {
    assert.equal(analyticsToken({ CONTEXT: 'production', [TOKEN_VARIABLE]: value }), '');
  }
  assert.equal(analyticsToken({ CONTEXT: 'production' }), '');
  // Other contexts and local builds never carry the beacon, even with the variable set.
  for (const CONTEXT of ['deploy-preview', 'branch-deploy', 'dev', '', undefined]) {
    assert.equal(analyticsToken(env({ CONTEXT })), '', String(CONTEXT));
  }
});
test('no Cloudflare site token is committed in the source', async () => {
  for (const file of ['../site.config.mjs', '../scripts/build.mjs', '../scripts/analytics-config.mjs']) {
    const text = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /["'`][a-f0-9]{32}["'`]/i, file);
  }
});
