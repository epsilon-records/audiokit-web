import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';

// EPSILON-169 PR 2: the public pages, prerendered and served from build/ (playwright.config.ts,
// project "site"). They read in full with JavaScript off, are clean at 320 px with touch targets
// of at least 44 px, reach every code panel by keyboard, and pass axe in both themes.

const PAGES = [
	'/',
	'/pricing/',
	'/privacy/',
	'/docs/',
	'/docs/reference/',
	'/docs/sdks/',
	'/docs/mcp/',
	'/check-your-inbox/',
	'/subscribed/'
];

const axeSource = readFileSync(
	createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
	'utf8'
);

test.describe('with JavaScript off', () => {
	test.use({ javaScriptEnabled: false });

	const headings: Record<string, string> = {
		'/': 'Audio analysis and processing, one job at a time.',
		'/pricing/': 'Prepaid credits, no subscription',
		'/docs/': 'Run your first job',
		'/docs/reference/': 'AudioKit API'
	};

	for (const [path, heading] of Object.entries(headings)) {
		test(`${path} reads in full`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			expect(response?.url()).toMatch(new RegExp(`${path.replace(/\//g, '\\/')}$`));
			await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
			// The header's links stay in view without the Menu disclosure, which needs scripts.
			const nav = page.getByRole('navigation', { name: 'Main' });
			await expect(nav.getByRole('link', { name: 'API reference' })).toBeVisible();
			await expect(nav.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
			await expect(nav.getByRole('link', { name: 'Start free' })).toHaveAttribute(
				'href',
				'/signup'
			);
			await expect(
				page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' })
			).toBeVisible();
		});
	}

	test('the API reference lists every operation and keeps its anchors', async ({ page }) => {
		await page.goto('/docs/reference/');
		await expect(page.locator('#operation-loudness')).toBeVisible();
		await expect(page.locator('#errors-api')).toBeAttached();
		await expect(page.getByRole('group').getByText('On this page')).toBeVisible();
	});
});

test.describe('at 320 px', () => {
	test.use({ viewport: { width: 320, height: 720 } });

	for (const path of PAGES) {
		test(`${path} fits the screen, and its touch targets are at least 44 px`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState('networkidle');
			// Open the Menu and the "On this page" list, so their targets are measured too.
			const menu = page.getByRole('button', { name: 'Menu' });
			if (await menu.isVisible()) await menu.click();
			for (const details of await page.locator('details:not([open]) > summary').all()) {
				await details.click();
			}
			const width = await page.evaluate(() => document.documentElement.scrollWidth);
			expect(width).toBeLessThanOrEqual(320);
			const small = await page.evaluate(() =>
				[...document.querySelectorAll<HTMLElement>('a[href], button, summary, input, select')]
					.filter((el) => {
						const style = getComputedStyle(el);
						if (style.visibility === 'hidden' || el.getClientRects().length === 0) return false;
						if (el.closest('.skip, .sr-only')) return false;
						// A link inside a line of text is exempt (WCAG 2.5.8, inline), as in a reference heading's
						// "Request body: JobRequest".
						if (style.display === 'inline' && el.closest('p, li, dd, td, small, h3, h4'))
							return false;
						return el.getBoundingClientRect().height < 44;
					})
					.map((el) => `${el.tagName} ${el.textContent?.trim().slice(0, 40)}`)
			);
			expect(small).toEqual([]);
		});
	}
});

test('every code panel can be reached by keyboard', async ({ page }) => {
	await page.goto('/docs/');
	await page.waitForLoadState('networkidle');
	const panels = await page.locator('main pre').count();
	expect(panels).toBeGreaterThan(3);
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	const reached = new Set<number>();
	for (let i = 0; i < 200 && reached.size < panels; i++) {
		await page.keyboard.press('Tab');
		const index = await page.evaluate(() =>
			[...document.querySelectorAll('main pre')].indexOf(document.activeElement as Element)
		);
		if (index >= 0) reached.add(index);
	}
	expect(reached.size).toBe(panels);
	// A focused panel shows where focus is.
	await page.locator('main pre').first().focus();
	const outline = await page
		.locator('main pre')
		.first()
		.evaluate((el) => getComputedStyle(el).outlineStyle);
	expect(outline).not.toBe('none');
});

test('the Menu opens at 320 px, and Esc closes it and returns focus', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto('/pricing/');
	await page.waitForLoadState('networkidle');
	const menu = page.getByRole('button', { name: 'Menu' });
	await menu.click();
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await expect(
		page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'MCP' })
	).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
	await expect(menu).toBeFocused();
});

test('prose links are underlined at rest', async ({ page }) => {
	await page.goto('/docs/');
	const link = page.locator('main p a, main li a').filter({ hasText: 'sign in' }).first();
	expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
		'underline'
	);
});

test.describe('axe', () => {
	test.use({ bypassCSP: true });

	for (const scheme of ['dark', 'light'] as const) {
		for (const path of PAGES) {
			test(`${path} (${scheme})`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.goto(path);
				await page.waitForLoadState('networkidle');
				await page.addScriptTag({ content: axeSource });
				const violations = await page.evaluate(async () => {
					const axe = (
						window as unknown as {
							axe: {
								run: (
									ctx: Document
								) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>;
							};
						}
					).axe;
					const result = await axe.run(document);
					return result.violations.map(
						(v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
					);
				});
				expect(violations).toEqual([]);
			});
		}
	}
});

async function html(page: Page, path: string) {
	const response = await page.request.get(path, { maxRedirects: 0 });
	return { status: response.status(), body: await response.text() };
}

test('each public URL answers 200 at its own address, unredirected', async ({ page }) => {
	for (const path of [
		...PAGES,
		'/404.html',
		'/docs/openapi.yaml',
		'/llms.txt',
		'/sitemap.xml',
		'/robots.txt'
	]) {
		expect((await html(page, path)).status, path).toBe(200);
	}
});

test('no server-rendered page carries the public pages’ scripts (shared 0011, 0016)', async ({
	page
}) => {
	for (const path of ['/login', '/signup']) {
		const { status, body } = await html(page, path);
		expect(status, path).toBe(200);
		expect(body, path).not.toMatch(
			/first-touch|analytics\.[\w-]+\.js|sentry-init|cloudflareinsights|data-site-token/
		);
		expect(body, path).toMatch(/<meta name="robots" content="noindex"/);
	}
	const home = await html(page, '/');
	expect(home.body).toMatch(/first-touch\.[\w-]+\.js/);
});

test('a path nothing answers gets the not-found page', async ({ page }) => {
	const response = await page.goto('/no-such-page/');
	expect(response?.status()).toBe(404);
	await expect(
		page.getByRole('heading', { name: "There's no page at this address." })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'API reference' }).first()).toBeVisible();
});
