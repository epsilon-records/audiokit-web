import { test, expect, type Page } from '@playwright/test';

// EPSILON-169 PR 1: the theme is set before first paint, follows the system until the visitor
// picks one, keeps code panels dark, and the fonts come from this origin only.

/** Records data-theme at the moment <body> is created, i.e. before anything can paint. */
async function recordThemeAtBody(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as { __themeAtBody?: string | null };
		new MutationObserver((_, observer) => {
			if (document.body) {
				w.__themeAtBody = document.documentElement.getAttribute('data-theme');
				observer.disconnect();
			}
		}).observe(document, { childList: true, subtree: true });
	});
}

const themeAtBody = (page: Page) =>
	page.evaluate(() => (window as unknown as { __themeAtBody?: string | null }).__themeAtBody);

async function signIn(page: Page, email: string) {
	await page.goto('/signup');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Email me a signup link' }).click();
	await page.getByRole('link', { name: 'Open the magic link' }).click();
	await expect(page.getByRole('heading', { name: 'Welcome to AudioKit' })).toBeVisible();
}

for (const scheme of ['dark', 'light'] as const) {
	test(`follows a ${scheme} system before first paint`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: scheme });
		await recordThemeAtBody(page);
		await page.goto('/login');
		expect(await themeAtBody(page)).toBe(scheme);
		await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
	});
}

test('a stored pick wins over the system, before first paint', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.addInitScript(() => localStorage.setItem('ak-theme', 'light'));
	await recordThemeAtBody(page);
	await page.goto('/login');
	expect(await themeAtBody(page)).toBe('light');
	const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	expect(bg).toBe('rgb(244, 244, 242)');
});

test('fonts are self-hosted: nothing is requested from another host', async ({ page }) => {
	const offsite: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.host !== '127.0.0.1:4173') offsite.push(request.url());
	});
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	await page.evaluate(() => document.fonts.ready);
	expect(offsite).toEqual([]);
	const loaded = await page.evaluate(() =>
		[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
	);
	expect(loaded).toContain('Space Grotesk');
});

test('the console toggle switches the theme, code panels stay dark, and the pick is kept', async ({
	page
}) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await signIn(page, 'theme-e2e@example.test');
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle');
	const system = page.getByRole('button', { name: 'Theme: System. Switch to Light' });
	const light = page.getByRole('button', { name: 'Theme: Light. Switch to Dark' });
	const dark = page.getByRole('button', { name: 'Theme: Dark. Switch to System' });
	await expect(system).toHaveAttribute('title', 'Theme: System');
	await expect(system).toHaveCSS('width', '44px');
	await expect(system).toHaveCSS('height', '44px');
	await expect(system.locator('svg')).toHaveAttribute('width', '18');
	await system.click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(light).toBeVisible();

	// The page is paper; the code panel stays dark.
	const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	expect(bodyBg).toBe('rgb(244, 244, 242)');
	const code = page.locator('pre.code').first();
	const codeColor = await code.evaluate((el) => getComputedStyle(el).color);
	expect(codeColor).toBe('rgb(213, 218, 224)');
	const panelBg = await code.evaluate(
		(el) => getComputedStyle(el.closest('.panel') as Element).backgroundColor
	);
	expect(panelBg).toBe('rgb(20, 23, 28)');

	// Kept across a reload, then System hands it back to the system.
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.waitForLoadState('networkidle');
	await light.click();
	await expect(dark).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme-choice', 'dark');
	expect(await page.evaluate(() => localStorage.getItem('ak-theme'))).toBe('dark');
	await dark.click();
	await expect(system).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme-choice', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	expect(await page.evaluate(() => localStorage.getItem('ak-theme'))).toBeNull();
});

test('at 320 px the console menu opens, and Esc closes it and returns focus', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await signIn(page, 'menu-e2e@example.test');
	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle');
	const menu = page.locator('#console-menu-button');
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
	await menu.click();
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await expect(
		page.getByRole('navigation', { name: 'Console' }).getByRole('link', { name: 'Usage' })
	).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
	await expect(menu).toBeFocused();
});
