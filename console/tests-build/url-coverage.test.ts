import { parse as parseYaml } from 'yaml';

import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { build, fileFor, readBuilt, repo, walk } from './lib';

/**
 * EPSILON-169 PR 2: every URL the static site serves today is produced by this app's build, at
 * the same address, trailing slash included, so nothing needs a redirect at the cut-over. The
 * list comes from the static site's own sources (../src) and the sitemap its build writes.
 */

// The static site's build: src/pages/x.html → /x/, x/index.html → /x/, 404.html stays a file
// (scripts/build.mjs, outPath and routePath).
function routeOf(rel: string): string {
	if (rel === 'index.html') return '/';
	if (rel === '404.html') return '/404.html';
	if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
	return `/${rel.replace(/\.html$/, '/')}`;
}

const pagesDir = join(repo, 'src/pages');
const pageFiles = walk(pagesDir).map((f) => relative(pagesDir, f));
const pageRoutes = pageFiles.map(routeOf);
const staticDir = join(repo, 'src/static');
const staticFiles = walk(staticDir).map((f) => `/${relative(staticDir, f)}`);

// Written by scripts/build.mjs besides the pages.
const generated = ['/docs/reference/', '/docs/openapi.yaml', '/sitemap.xml', '/robots.txt'];

// Replaced by the app's hashed assets, and referenced by no page (plan, "Routes and URL map"):
// the plan keeps no redirect for them. /sentry-init.js was written only when a DSN was set.
const REPLACED = ['/styles.css', '/site.js', '/analytics.js', '/first-touch.js'];

// The static site's sitemap: every page without "noindex", and the reference.
const oldSitemap = [
	...pageFiles
		.filter(
			(f) => !/"noindex":\s*true/.test(readFileSync(join(pagesDir, f), 'utf8').split('\n')[0])
		)
		.map(routeOf),
	'/docs/reference/',
	// App-only page (AudioKit 0090): the static site is retired and has no terms page.
	'/terms/'
].sort();

const oldUrls = [
	...pageRoutes,
	'/terms/',
	...generated,
	...staticFiles.filter((f) => !REPLACED.includes(f))
];

describe('every URL of the static site is in the build', () => {
	it('knows the whole list', () => {
		expect([...oldUrls].sort()).toEqual(
			[
				'/',
				'/404.html',
				'/check-your-inbox/',
				'/docs/',
				'/docs/mcp/',
				'/docs/openapi.yaml',
				'/docs/reference/',
				'/docs/sdks/',
				'/favicon.svg',
				'/llms.txt',
				'/logo.png',
				'/og.png',
				'/pricing/',
				'/privacy/',
				'/robots.txt',
				'/sitemap.xml',
				'/subscribed/',
				'/terms/'
			].sort()
		);
		expect(staticFiles.filter((f) => REPLACED.includes(f)).sort()).toEqual([...REPLACED].sort());
	});

	for (const url of oldUrls) {
		it(url, () => expect(existsSync(join(build, fileFor(url))), fileFor(url)).toBe(true));
	}

	it('a page URL without the trailing slash is not a file of its own (Netlify adds the slash)', () => {
		for (const url of pageRoutes.filter((u) => u.endsWith('/') && u !== '/')) {
			expect(existsSync(join(build, `${url.slice(1, -1)}.html`)), url).toBe(false);
		}
	});
});

describe('the sitemap', () => {
	const built = [
		...readBuilt('sitemap.xml').matchAll(/<loc>https:\/\/audiokit\.ai([^<]*)<\/loc>/g)
	].map((m) => m[1]);

	it('lists the HTML pages and the OpenAPI download', () => {
		expect(built).toEqual([...oldSitemap, '/docs/openapi.yaml'].sort());
	});

	for (const url of oldSitemap) {
		it(`${url} is a built page`, () => {
			const html = readBuilt(fileFor(url));
			expect(html).toContain(`<link rel="canonical" href="https://audiokit.ai${url}"`);
			expect(html).not.toMatch(/<meta name="robots" content="noindex"/);
		});
	}

	it('robots.txt points at it', () => {
		expect(readBuilt('robots.txt')).toContain('Sitemap: https://audiokit.ai/sitemap.xml');
	});
});

describe('the plain files', () => {
	it('/docs/openapi.yaml is the contract', () => {
		expect(readBuilt('docs/openapi.yaml')).toBe(
			readFileSync(join(repo, 'contract/openapi.yaml'), 'utf8')
		);
	});

	it('/llms.txt matches the app copy', () => {
		expect(readBuilt('llms.txt')).toBe(
			readFileSync(join(repo, 'console/src/lib/site/llms.txt'), 'utf8')
		);
	});

	it('/404.html is the not-found page, noindex', () => {
		const html = readBuilt('404.html');
		expect(html).toContain("There's no page at this address.");
		expect(html).toMatch(/<meta name="robots" content="noindex"/);
	});

	it('builds nothing at the old console’s /pricing', () => {
		expect(existsSync(join(build, 'pricing.html'))).toBe(false);
		expect(relative(build, join(build, fileFor('/pricing/')))).toBe('pricing/index.html');
	});
});

describe('agent documentation', () => {
	it('discovers llms.txt from the HTML and tracks every contract operation', () => {
		expect(readBuilt('index.html')).toContain('type="text/plain" href="/llms.txt"');
		const operations = readBuilt('llms.txt').split('## Operations')[1].split('Planned')[0];
		const listed = [...operations.matchAll(/`([a-z_]+)`/g)].map((match) => match[1]);
		const { components } = parseYaml(readBuilt('docs/openapi.yaml'));
		expect(listed.sort()).toEqual([...components.schemas.Operation.enum].sort());
	});

	it('builds each docs twin and includes them in the plain-text bundle', () => {
		const bundle = readBuilt('llms-full.txt');
		for (const name of ['index', 'reference', 'sdks', 'mcp']) {
			const docs = readBuilt(`docs/${name}.md`);
			expect(docs).toMatch(/^# /m);
			expect(bundle).toContain(docs);
		}
		expect(readBuilt('docs/reference.md')).toContain('/v1/jobs');
		expect(readBuilt('docs/mcp.md')).toContain('bearer_token_env_var');
	});

	it('publishes parseable client examples without credentials', () => {
		const mcp = readBuilt('docs/mcp.md');
		const configs = [...mcp.matchAll(/```\s*\n(\{[\s\S]*?\})\n```/g)]
			.map((match) => JSON.parse(match[1]))
			.filter((config) => config.servers || config.mcpServers);
		expect(configs).toHaveLength(3);
		for (const config of configs) {
			const server = (config.servers ?? config.mcpServers).audiokit;
			expect(server.url).toBe('https://api.audiokit.ai/mcp');
			expect(server.headers.Authorization).toMatch(/^Bearer \$\{[^}]+\}$/);
		}
		expect(mcp).toContain('No sign in');
	});
});
