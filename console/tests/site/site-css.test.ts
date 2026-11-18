import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// EPSILON-169 PR 2: the public pages' stylesheet is the static site's, scoped to <main class="site">.

const site = readFileSync(new URL('../../src/site.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../src/app.css', import.meta.url), 'utf8');

/** The custom properties a selector's last block sets. */
function vars(css: string, selector: string) {
	const start = css.lastIndexOf(`${selector} {`);
	expect(start, selector).toBeGreaterThanOrEqual(0);
	const body = css.slice(start, css.indexOf('}', start));
	return Object.fromEntries(
		[...body.matchAll(/(--[a-z0-9-]+|color-scheme):\s*([^;]+);/gi)].map((m) => [m[1], m[2]])
	);
}

describe('src/site.css', () => {
	it('scopes every rule to the public pages', () => {
		const selectors = site
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/@media[^{]+\{/g, '')
			.split('}')
			.map((block) => block.split('{')[0].trim())
			.filter(Boolean)
			.flatMap((s) => s.split(/,(?![^(]*\))/).map((x) => x.trim()));
		expect(selectors.length).toBeGreaterThan(100);
		for (const selector of selectors) expect(selector).toMatch(/^\.site /);
	});

	it('keeps the home page’s example console dark, with the dark islands’ values', () => {
		expect(vars(site, '.site .console')).toEqual(vars(app, '.dark-island'));
	});

	it('underlines prose links at rest', () => {
		expect(site).toMatch(
			/\.site :is\(p, li, dd, td\) a:not\(\.btn\):not\(\.link\) \{\s*text-decoration: underline;/
		);
	});
});
