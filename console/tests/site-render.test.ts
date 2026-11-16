import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import anchors from './fixtures/reference-anchors.json';
import { SITE_PAGES } from '../src/lib/site/routes';
import {
	analyticsStatus,
	fill,
	focusableCode,
	renderSitePage,
	toc
} from '../src/lib/server/site/render';
import { robotsTxt, siteHost, sitemapXml } from '../src/lib/server/site/files';
import { contractCandidates } from '../src/lib/server/site/contract';

// EPSILON-169 PR 2: the public pages render from the static site's sources, at build time.

const pages = await Promise.all(SITE_PAGES.map((p) => renderSitePage(p.path)));
const byPath = new Map(pages.map((p) => [p.path, p]));

describe('every public page renders', () => {
	for (const page of pages) {
		it(page.path, () => {
			expect(page.meta.title).toBeTruthy();
			expect(page.body).not.toMatch(/\{\{[A-Z_]+\}\}/);
			expect(page.body).not.toMatch(/<!--\/?kit-->/);
			expect(page.body).not.toMatch(/console\.audiokit\.ai\/(login|signup)/);
		});
	}

	it('keeps the static site’s paths, trailing slash included', () => {
		expect(SITE_PAGES.map((p) => p.path)).toEqual([
			'/',
			'/pricing/',
			'/privacy/',
			'/docs/',
			'/docs/reference/',
			'/docs/sdks/',
			'/docs/mcp/',
			'/check-your-inbox/',
			'/subscribed/',
			'/404.html'
		]);
	});

	it('marks the confirmation pages and the not-found page noindex, and nothing else', () => {
		expect(pages.filter((p) => p.meta.noindex).map((p) => p.path)).toEqual([
			'/check-your-inbox/',
			'/subscribed/',
			'/404.html'
		]);
	});
});

describe('one origin (AudioKit 0053)', () => {
	it('sends Sign in and Start free to this app’s /login and /signup', () => {
		const home = byPath.get('/')!.body;
		expect(home).toContain('href="/signup"');
		expect(byPath.get('/pricing/')!.body).toMatch(/href="\/signup">Start free</);
		expect(byPath.get('/docs/')!.body).toContain('href="/login"');
	});

	it("names no console in the privacy notice, only the cookie's real name (Nate, knowledge#135)", () => {
		const body = byPath.get('/privacy/')!.body.replaceAll('ak_console_session', '');
		expect(body).not.toMatch(/console/i);
	});
});

describe('the API reference', () => {
	const ref = byPath.get('/docs/reference/')!;

	it('keeps every anchor, in order (plan, "Anchors")', () => {
		const ids = [...ref.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
		expect(ids).toEqual(anchors);
	});

	it('is generated from the contract, with its version', () => {
		const contract = readFileSync(new URL('../../contract/openapi.yaml', import.meta.url), 'utf8');
		const version = /^\s+version:\s*"?([^"\n]+)"?/m.exec(contract)![1];
		expect(ref.apiVersion).toBe(version);
		expect(ref.meta.description).toContain(`v${version}`);
	});

	it('has an "On this page" list from its headings', () => {
		expect(ref.toc.map((t) => t.id)).toContain('operations');
	});
});

describe('the contract source order', () => {
	it('tries $AUDIOKIT_OPENAPI_URL, then the live API, then the repo copy', () => {
		expect(contractCandidates({ AUDIOKIT_OPENAPI_URL: 'https://example.test/o.yaml' })).toEqual([
			'https://example.test/o.yaml',
			'https://api.audiokit.ai/v1/openapi.yaml'
		]);
		expect(contractCandidates({})).toEqual(['https://api.audiokit.ai/v1/openapi.yaml']);
	});
});

describe('code panels can be reached by keyboard', () => {
	it('gives every <pre> tabindex="0", once', () => {
		expect(focusableCode('<pre class="code">x</pre><pre>y</pre><pre tabindex="-1">z</pre>')).toBe(
			'<pre tabindex="0" class="code">x</pre><pre tabindex="0">y</pre><pre tabindex="-1">z</pre>'
		);
		expect(focusableCode('<prefix>')).toBe('<prefix>');
	});

	it('leaves no <pre> without it on any page', () => {
		for (const page of pages) {
			for (const [tag] of page.body.matchAll(/<pre\b[^>]*>/g))
				expect(tag, page.path).toContain('tabindex="0"');
		}
	});
});

describe('the build helpers the static site had', () => {
	it('lists "On this page" from <h2 id> and <h3 id data-toc>', () => {
		expect(
			toc('<h2 id="a">A <code>b</code></h2><h3 id="c">C</h3><h3 id="d" data-toc="Dee">D</h3>')
		).toEqual([
			{ level: 2, id: 'a', label: 'A b' },
			{ level: 3, id: 'd', label: 'Dee' }
		]);
	});

	it('refuses an unknown token', () => {
		expect(() => fill('{{NOPE}}', {}, 'x.html')).toThrow(/unknown token \{\{NOPE\}\}/);
	});

	it('states the analytics sentence by whether the beacon is on', () => {
		expect(analyticsStatus(true)).toMatch(/^We use Cloudflare Web Analytics/);
		expect(analyticsStatus(false)).toMatch(/currently disabled/);
	});
});

describe('sitemap.xml and robots.txt', () => {
	it('lists the seven indexable pages, as the static site does', async () => {
		const locs = [...(await sitemapXml()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		expect(locs).toEqual([
			'https://audiokit.ai/',
			'https://audiokit.ai/docs/',
			'https://audiokit.ai/docs/mcp/',
			'https://audiokit.ai/docs/reference/',
			'https://audiokit.ai/docs/sdks/',
			'https://audiokit.ai/pricing/',
			'https://audiokit.ai/privacy/'
		]);
	});

	it('allows every crawler on audiokit.ai (shared 0080) and none on the console host', () => {
		expect(robotsTxt('audiokit')).toBe(
			'User-agent: *\nAllow: /\n\nSitemap: https://audiokit.ai/sitemap.xml\n'
		);
		expect(robotsTxt('console')).toMatch(/User-agent: \*\nDisallow: \/\n$/);
	});

	it('knows the console host from Netlify’s site name, or PUBLIC_SITE_HOST', () => {
		expect(siteHost({ SITE_NAME: 'audiokit-console' })).toBe('console');
		expect(siteHost({ SITE_NAME: 'audiokit' })).toBe('audiokit');
		expect(siteHost({})).toBe('audiokit');
		expect(siteHost({ SITE_NAME: 'audiokit', PUBLIC_SITE_HOST: 'console' })).toBe('console');
		expect(siteHost({ SITE_NAME: 'audiokit-console', PUBLIC_SITE_HOST: 'audiokit' })).toBe(
			'audiokit'
		);
	});
});
