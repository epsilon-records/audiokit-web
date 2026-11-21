import { describe, expect, it } from 'vitest';
import { analyticsToken } from '../src/lib/site/analytics-config.js';
import { sentryDsn } from '../src/lib/server/site/public-head';
import { htmlFiles, readBuilt } from './lib';

/**
 * The public pages' scripts in the build (EPSILON-169 PR 2), ported from the static site's
 * test/analytics-output.mjs. Same environment as the build that produced build/: the analytics
 * loader only with the token and CONTEXT=production, Sentry only with a DSN.
 */

const token = analyticsToken();
const dsn = sentryDsn();
const NOINDEX = ['404.html', 'check-your-inbox/index.html', 'subscribed/index.html'];

describe('each public page', () => {
	for (const file of htmlFiles) {
		it(file, () => {
			const html = readBuilt(file);
			expect(html).toMatch(/href="\/privacy\/"/);
			// The beacon is only ever added by the guarded loader, never written into a page. (The
			// policy in the page's <meta> names its host, so that tag is left out of this check.)
			const body = html.replace(/<meta http-equiv="content-security-policy"[^>]*>/, '');
			expect(body).not.toMatch(
				/\{\{ANALYTICS_STATUS\}\}|data-cf-beacon|static\.cloudflareinsights\.com/
			);
			const loaders = [
				...html.matchAll(
					/<script src="[^"]*\/analytics\.[\w-]+\.js" data-site-token="([^"]+)" defer><\/script>/g
				)
			];
			const expected = token !== '' && !NOINDEX.includes(file) ? 1 : 0;
			expect(loaders.length).toBe(expected);
			for (const tag of loaders) expect(tag[1]).toBe(token);
			expect(html).toMatch(/<script src="[^"]*\/first-touch\.[\w-]+\.js" defer><\/script>/);
			expect(/sentry-init\.[\w-]+\.js" data-sentry=/.test(html)).toBe(dsn !== '');
		});
	}

	it('the privacy notice states whether the beacon is on', () => {
		expect(readBuilt('privacy/index.html')).toMatch(
			token ? /We use Cloudflare Web Analytics/ : /Cloudflare Web Analytics is currently disabled/
		);
	});
});
