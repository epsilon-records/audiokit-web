// No repository dependencies needed: PLAYWRIGHT_MODULE points to an existing Playwright install.
// Requires installed Google Chrome; CI has no declared Playwright dependency.
// Run after npm run build: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node test/analytics.browser.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { analyticsToken } from '../scripts/analytics-config.mjs';
const token = analyticsToken();
assert.ok(process.env.PLAYWRIGHT_MODULE, 'Set PLAYWRIGHT_MODULE to an existing Playwright index.mjs; this command installs nothing');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const loader = await readFile(new URL('../src/static/analytics.js', import.meta.url), 'utf8');
const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (token) assert.ok(built.includes(`data-site-token="${token}"`));
else assert.doesNotMatch(built, /src="\/analytics.js"|data-cf-beacon/);
// Fetch only the public script. All browser traffic below is fulfilled/aborted locally.
const vendorResponse = await fetch('https://static.cloudflareinsights.com/beacon.min.js');
assert.ok(vendorResponse.ok);
const vendor = await vendorResponse.text();
console.log('Official beacon SHA256:', createHash('sha256').update(vendor).digest('hex'));
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
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const requests = [];
    const unexpected = [];
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if ((url.hostname === 'static.cloudflareinsights.com' && url.pathname === '/beacon.min.js') ||
          ((url.hostname === 'cloudflareinsights.com' || url.origin === 'https://audiokit.ai') && url.pathname === '/cdn-cgi/rum')) {
        requests.push({ url: request.url(), headers: await request.allHeaders(), body: request.postData() });
        // Execute actual fetched vendor JS, but fulfill every analytics submission locally.
        await route.fulfill({ contentType: 'application/javascript', body: request.url().includes('beacon.min.js')
          ? vendor : '' });
      } else if (request.url().endsWith('/analytics.js')) {
        await route.fulfill({ contentType: 'application/javascript', body: loader });
      } else if (request.isNavigationRequest()) {
        const setup = `${c.scrub ? "history.replaceState(null,'','/');" : ''}${c.unknownNavigation ? "performance.getEntriesByType=()=>[];" : ''}${c.overrideReferrer ? `Object.defineProperty(document,'referrer',{value:${JSON.stringify(c.referrer)}});` : ''}`;
        const tag = `<script src="/analytics.js" data-site-token="${c.id ?? fixture}"></script>`;
        await route.fulfill({ contentType: 'text/html', body: `<html><head><script>${setup}</script>${tag}${c.twice ? tag : ''}</head><body>Local privacy test</body></html>` });
      } else {
        unexpected.push(request.url());
        await route.abort();
      }
    });
    const page = await context.newPage();
    await page.goto(c.url ?? safe, c.referrer && !c.overrideReferrer ? { referer: c.referrer } : {});
    await page.waitForLoadState('networkidle');
    assert.deepEqual(unexpected, [], 'unknown vendor traffic must be reviewed');
    const scripts = await page.locator('script[data-cf-beacon]').count();
    assert.equal(scripts, c.allow ? 1 : 0, c.name);
    assert.equal(requests.filter(r => r.url.includes('beacon.min.js')).length, c.allow ? 1 : 0, c.name);
    assert.equal(requests.filter(r => r.url.includes('/rum')).length, c.allow ? 1 : 0, c.name);
    if (c.allow) {
      const payload = JSON.parse(requests.find(r => r.body)?.body);
      assert.equal(payload.siteToken, fixture);
      assert.equal(payload.versions.js, '2026.10.1', 'review new vendor versions before accepting changed behavior');
    }
    assert.ok(!JSON.stringify(requests).includes(marker), c.name + ' leaked marker');
    if (c.allow) assert.equal(requests[0].headers.referer, undefined, 'vendor script has no Referer');
    console.log(`PASS ${c.name}: scripts=${scripts}, intercepted analytics requests=${requests.length}, marker leaks=0`);
    await context.close();
  }

  for (const lifecycle of ['visibility + unload', 'docs anchors', 'full navigation + back-forward']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const requests = [];
    const unexpected = [];
    const navigations = [];
    await context.route('**/*', async route => {
      const r = route.request();
      const url = new URL(r.url());
      if (url.hostname === 'static.cloudflareinsights.com' && url.pathname === '/beacon.min.js') {
        requests.push({ url: r.url(), headers: await r.allHeaders(), body: r.postData() });
        return route.fulfill({ contentType: 'application/javascript', body: vendor });
      }
      if (((url.hostname === 'cloudflareinsights.com' || url.origin === 'https://audiokit.ai') && url.pathname === '/cdn-cgi/rum')) {
        requests.push({ url: r.url(), headers: await r.allHeaders(), body: r.postData() });
        return route.fulfill({ status: 204 });
      }
      if (url.origin === 'https://audiokit.ai' && url.pathname === '/analytics.js') {
        return route.fulfill({ contentType: 'application/javascript', body: loader });
      }
      if (url.origin === 'https://audiokit.ai' && r.isNavigationRequest()) {
        navigations.push(r.url());
        return route.fulfill({ contentType: 'text/html', body: `<html><head><script src="/analytics.js" data-site-token="${fixture}" defer></script></head><body><h1>Public docs</h1><a id="anchor" href="#${marker}">Docs anchor</a><div id="${marker}">Public section</div><a id="safe" href="/pricing/">Pricing</a><a id="unsafe" href="/auth/callback?token=${marker}">Fabricated auth link</a></body></html>` });
      }
      unexpected.push(r.url());
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(safe + 'docs/');
    await page.waitForLoadState('networkidle');
    assert.equal(requests.filter(r => r.url.includes('beacon.min.js')).length, 1);
    assert.ok(requests.some(r => r.body && JSON.parse(r.body).eventType === 1), 'real vendor pageload sent to interceptor');
    const initial = requests.length;
    if (lifecycle === 'docs anchors') {
      await page.click('#anchor');
      assert.ok(page.url().endsWith('#' + marker));
      await page.goBack();
      await page.goForward();
    }
    if (lifecycle === 'full navigation + back-forward') {
      await page.click('#safe');
      await page.waitForLoadState('networkidle');
      assert.equal(requests.filter(r => r.url.includes('beacon.min.js')).length, 2, 'full safe navigation installs one beacon per new document');
      const beforeUnsafe = requests.filter(r => r.url.includes('beacon.min.js')).length;
      await page.click('#unsafe');
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('script[data-cf-beacon]').count(), 0, 'unsafe full document has no beacon');
      assert.equal(requests.filter(r => r.url.includes('beacon.min.js')).length, beforeUnsafe);
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await page.goForward();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('script[data-cf-beacon]').count(), 0, 'history returns to unsafe document without beacon');
      console.log('Observed full-document URLs:', navigations);
    }
    // Invoke the actual vendor's visibility handler; headless has no physical tab hiding.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForLoadState('networkidle');
    if (lifecycle !== 'full navigation + back-forward') {
      await page.waitForFunction(() => performance.now() > 1000);
      assert.ok(requests.length > initial, 'hidden vitals reached interceptor');
      assert.ok(requests.some(r => r.body && JSON.parse(r.body).eventType !== 1), 'real vendor vitals payload observed');
      if (lifecycle === 'docs anchors') assert.equal(requests.filter(r => r.url.includes('beacon.min.js')).length, 1, 'anchors do not install another beacon');
    }
    // Real full navigation runs pagehide/unload; wait for its intercepted requests to settle.
    await page.goto('https://audiokit.ai/auth/' + marker);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('script[data-cf-beacon]').count(), 0);
    assert.ok(!JSON.stringify(requests).includes(marker), lifecycle + ' leaked marker');
    assert.deepEqual(unexpected, [], 'unknown vendor traffic must be reviewed');
    assert.deepEqual(errors, [], 'actual vendor execution must not throw');
    const payloads = requests.filter(r => r.body).map(r => JSON.parse(r.body));
    console.log(`PASS actual vendor ${lifecycle}: scripts=${requests.filter(r=>r.url.includes('beacon.min.js')).length}, payloads=${payloads.length}, eventTypes=${payloads.map(p=>p.eventType)}, marker leaks=0`);
    await context.close();
  }
} finally { await browser.close(); }
console.log(`${cases.length} actual-vendor guard scenarios and 3 lifecycle scenarios passed; all browser requests intercepted, no event transmitted.`);
