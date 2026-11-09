// No repository dependencies needed: PLAYWRIGHT_MODULE points to an existing Playwright install.
// Run after npm run build: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node test/analytics.browser.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const loader = await readFile(new URL('../src/static/analytics.js', import.meta.url), 'utf8');
const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.doesNotMatch(built, /src="\/analytics.js"|data-cf-beacon/);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const safe = 'https://audiokit.ai/';
const marker = 'FABRICATED_SENSITIVE_7391';
const fixture = 'a'.repeat(32); // Intercepted test only, never sent to Cloudflare.
const cases = [
  { name: 'missing ID', id: '' },
  { name: 'safe duplicate loader', allow: true, twice: true },
  { name: 'safe public docs', url: safe + 'docs/', allow: true },
  { name: 'query', url: safe + '?token=' + marker },
  { name: 'fragment', url: safe + '#' + marker },
  { name: 'auth error document', url: safe + 'auth/callback?token=' + marker },
  { name: 'unknown path', url: safe + 'catalog/' + marker },
  { name: 'unsafe original navigation scrubbed', url: safe + '?token=' + marker, scrub: true },
  { name: 'unsafe original path scrubbed', url: safe + 'auth/' + marker, scrub: true },
  { name: 'sensitive referrer', referrer: safe + 'auth/callback?token=' + marker },
  { name: 'referrer fragment', referrer: safe + '#' + marker, overrideReferrer: true },
  { name: 'referrer sensitive path', referrer: safe + 'reset/' + marker },
  { name: 'unknown navigation context', unknownNavigation: true },
  ...['console.audiokit.ai', 'api.audiokit.ai', 'billing.audiokit.ai', 'preview.netlify.app', 'www.audiokit.ai', 'localhost'].map(host => ({ name: host, url: `https://${host}/` })),
];
try {
  for (const c of cases) {
    const context = await browser.newContext();
    const requests = [];
    await context.route('**/*', async route => {
      const request = route.request();
      if (request.url().includes('cloudflareinsights.com')) {
        requests.push({ url: request.url(), headers: request.headers(), body: request.postData() });
        // Local test double confirms requests/headers; no vendor execution or external collection.
        await route.fulfill({ contentType: 'application/javascript', body: request.url().includes('beacon.min.js')
          ? `navigator.sendBeacon('https://cloudflareinsights.com/cdn-cgi/rum', JSON.stringify({landingPath: performance.getEntriesByType('navigation')[0].name,referrer:document.referrer}));` : '' });
      } else if (request.url().endsWith('/analytics.js')) {
        await route.fulfill({ contentType: 'application/javascript', body: loader });
      } else {
        const setup = `${c.scrub ? "history.replaceState(null,'','/');" : ''}${c.unknownNavigation ? "performance.getEntriesByType=()=>[];" : ''}${c.overrideReferrer ? `Object.defineProperty(document,'referrer',{value:${JSON.stringify(c.referrer)}});` : ''}`;
        const tag = `<script src="/analytics.js" data-site-token="${c.id ?? fixture}"></script>`;
        await route.fulfill({ contentType: 'text/html', body: `<html><head><script>${setup}</script>${tag}${c.twice ? tag : ''}</head><body>Local privacy test</body></html>` });
      }
    });
    const page = await context.newPage();
    await page.goto(c.url ?? safe, c.referrer && !c.overrideReferrer ? { referer: c.referrer } : {});
    await page.waitForLoadState('networkidle');
    const scripts = await page.locator('script[data-cf-beacon]').count();
    assert.equal(scripts, c.allow ? 1 : 0, c.name);
    assert.equal(requests.filter(r => r.url.includes('beacon.min.js')).length, c.allow ? 1 : 0, c.name);
    assert.equal(requests.filter(r => r.url.includes('/rum')).length, c.allow ? 1 : 0, c.name);
    assert.ok(!JSON.stringify(requests).includes(marker), c.name + ' leaked marker');
    if (c.allow) assert.equal(requests[0].headers.referer, undefined, 'vendor script has no Referer');
    console.log(`PASS ${c.name}: scripts=${scripts}, intercepted analytics requests=${requests.length}, marker leaks=0`);
    await context.close();
  }
} finally { await browser.close(); }
console.log(`${cases.length} browser scenarios passed; no external requests or real token used.`);
