import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// EPSILON-169 PR 3: the console's pages on the shared components. Each one fits 320 px, keeps its
// touch targets at least 44 px and passes axe in both themes; the overlays work by keyboard; the
// credits page and the low-balance switch read billing's shape (the mock adapter answers as
// epsilon-billing#81 would). Mock adapter only: nothing here reaches billing or charges a card.

const axeSource = readFileSync(
	createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
	'utf8'
);

// axe is injected as an inline script, which the console's CSP rightly refuses.
test.use({ bypassCSP: true });

const SIGNED_IN = [
	'/dashboard',
	'/usage',
	'/api-keys',
	'/credits',
	'/settings',
	'/settings/billing',
	'/onboarding'
];
const SIGNED_OUT = ['/login', '/signup', '/auth/callback?token=not-a-token'];

/** The mock adapter's session for its fixture account (you@example.com). */
async function signedIn(context: BrowserContext) {
	await context.addCookies([
		{ name: 'ak_console_session', value: 'mock.you%40example.com', url: 'http://127.0.0.1:4173' }
	]);
}

async function axeViolations(page: Page): Promise<string[]> {
	await page.addScriptTag({ content: axeSource });
	return page.evaluate(async () => {
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
}

/** Visible targets under 44 px. A link inside a sentence is exempt (WCAG 2.5.8, inline). */
async function smallTargets(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		[
			...document.querySelectorAll<HTMLElement>(
				'a[href], button, summary, input:not([type=hidden]), select, textarea'
			)
		]
			.filter((el) => {
				const style = getComputedStyle(el);
				if (style.visibility === 'hidden' || el.getClientRects().length === 0) return false;
				if (el.closest('.skip, .sr-only')) return false;
				if (style.display === 'inline' && el.closest('p, li, dd, td')) return false;
				// A checkbox or switch is measured by its row: the whole label row is the target.
				if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
					const row = el.closest('[data-slot=field], .min-h-11');
					return (row?.getBoundingClientRect().height ?? 0) < 44;
				}
				return el.getBoundingClientRect().height < 44;
			})
			.map((el) => `${el.tagName} ${el.textContent?.trim().slice(0, 40)}`)
	);
}

for (const scheme of ['dark', 'light'] as const) {
	test.describe(`${scheme} theme`, () => {
		for (const path of [...SIGNED_IN, ...SIGNED_OUT]) {
			test(`${path}: 320 px, touch targets and axe`, async ({ page, context }) => {
				if (SIGNED_IN.includes(path)) await signedIn(context);
				await page.setViewportSize({ width: 320, height: 720 });
				await page.emulateMedia({ colorScheme: scheme });
				await page.goto(path);
				await page.waitForLoadState('networkidle');
				await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
					320
				);
				expect(await smallTargets(page)).toEqual([]);
				// Open the drawer, then the account menu, so their targets are measured too.
				const menu = page.locator('#console-menu-button');
				if (await menu.isVisible()) {
					await menu.click();
					expect(await smallTargets(page)).toEqual([]);
					await page.keyboard.press('Escape');
					await page.locator('header details > summary').click();
					expect(await smallTargets(page)).toEqual([]);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
					320
				);
				expect(await axeViolations(page)).toEqual([]);
			});
		}

		test(`desktop pages pass axe (${scheme})`, async ({ page, context }) => {
			await signedIn(context);
			await page.emulateMedia({ colorScheme: scheme });
			for (const path of SIGNED_IN) {
				await page.goto(path);
				await page.waitForLoadState('networkidle');
				expect(await axeViolations(page), path).toEqual([]);
			}
		});
	});
}

test('the 320 px top bar keeps the brand, the Menu and the account menu in view', async ({
	page,
	context
}) => {
	await signedIn(context);
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto('/dashboard');
	const bar = page.locator('header').first();
	for (const target of [
		page.locator('#console-menu-button'),
		bar.getByRole('link', { name: 'AudioKit' }),
		bar.locator('summary')
	]) {
		const box = (await target.boundingBox())!;
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(320);
	}
	// They don't overlap.
	const brand = (await bar.getByRole('link', { name: 'AudioKit' }).boundingBox())!;
	const account = (await bar.locator('summary').boundingBox())!;
	expect(brand.x + brand.width).toBeLessThanOrEqual(account.x);
});

test('the credits page shows the balance, its lots, movements and the three packs', async ({
	page,
	context
}) => {
	await signedIn(context);
	await page.goto('/credits');
	await expect(page.getByRole('heading', { level: 1, name: 'Credits' })).toBeVisible();
	const main = page.getByRole('main');
	await expect(main.getByText('Low', { exact: true })).toBeVisible();
	await expect(main.getByText('Below 20 credits since 14 Nov.')).toBeVisible();
	const lots = main.getByRole('table', { name: 'Credits you can spend' });
	await expect(lots.getByRole('cell', { name: 'Free monthly' })).toBeVisible();
	await expect(lots.getByRole('cell', { name: '16 of 100' })).toBeVisible();
	await expect(lots.getByRole('cell', { name: 'Lapses 1 December 2026 (UTC)' })).toBeVisible();
	const movements = main.getByRole('table', { name: 'Newest first' });
	await expect(movements.getByRole('row')).toHaveCount(6);
	await expect(movements.getByRole('cell', { name: '+100' })).toBeVisible();
	for (const credits of ['1,000 credits', '5,500 credits', '24,000 credits']) {
		await expect(main.getByText(credits)).toBeVisible();
	}
	// No pack has a price (0066), and buying is PR 5: nothing to press.
	await expect(main.getByText('Not on sale yet')).toHaveCount(3);
	await expect(main.getByRole('button')).toHaveCount(0);
	// The navigation names it, and the shell's low banner links here.
	await expect(
		page.getByRole('navigation', { name: 'Console' }).getByRole('link', { name: 'Credits' })
	).toHaveAttribute('aria-current', 'page');
	await expect(main.getByText('Running low on credits.')).toBeVisible();
});

test('revoking a key asks in an Alert Dialog that Esc cancels, returning focus', async ({
	page,
	context
}) => {
	await signedIn(context);
	await page.goto('/api-keys');
	await page.waitForLoadState('networkidle');
	const revoke = page.getByRole('button', { name: 'Revoke' }).first();
	await revoke.focus();
	await page.keyboard.press('Enter');
	const dialog = page.getByRole('alertdialog', { name: 'Revoke API key' });
	await expect(dialog).toBeVisible();
	// Focus starts inside it, and Tab stays inside it.
	for (let i = 0; i < 4; i++) {
		await page.keyboard.press('Tab');
		expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
	}
	expect(await axeViolations(page)).toEqual([]);
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(revoke).toBeFocused();
});

test.describe('api keys without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a key can be created, its one-time secret is shown, and it can be revoked', async ({
		page,
		context
	}) => {
		await signedIn(context);
		await page.goto('/api-keys');
		// The mock's keys live in the dev server's memory, so each run names its own.
		const label = `nojs-${Date.now()}`;
		const form = page.locator('form[action="?/create"]');
		await form.getByLabel('Label (optional)').fill(label);
		await form.getByRole('button', { name: 'Create key' }).click();
		// The reveal is in the response to the POST itself. Playwright's text and role engines skip
		// <noscript>, which is where this markup lives, so read the document and use CSS.
		await expect.poll(() => page.content()).toContain('Copy this key now. It is shown once.');
		expect(await page.content()).toMatch(/ak_live_[0-9a-f]+/);
		await page.goto('/api-keys');
		expect(await page.content()).not.toContain('Copy this key now. It is shown once.');
		const row = page.getByRole('row', { name: label });
		await row.locator('a[href^="?revoke="]').click();
		await expect.poll(() => page.content()).toContain(`<strong>${label}</strong>`);
		await page.locator('form[action="?/revoke"] button[type="submit"]').click();
		await expect(
			page.getByRole('row', { name: label }).getByText('revoked', { exact: true })
		).toBeVisible();
	});
});

test('revoking a key says so in a toast', async ({ page }) => {
	// A fresh account, so revoking doesn't change the fixture account other tests read.
	await page.goto('/signup');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Email').fill('revoke-toast-e2e@example.test');
	await page.getByRole('button', { name: 'Email me a signup link' }).click();
	await page.getByRole('link', { name: 'Open the magic link' }).click();
	await page.goto('/api-keys');
	await page.waitForLoadState('networkidle');
	const createDialog = page.getByRole('dialog', { name: 'Create API key' });
	await expect(async () => {
		await page.getByRole('button', { name: 'Create key' }).first().click();
		await expect(createDialog).toBeVisible({ timeout: 1_000 });
	}).toPass();
	// The mock's keys live in the dev server's memory, so each run names its own.
	const label = `toast-${Date.now()}`;
	await page.getByLabel('Label (optional)').fill(label);
	await createDialog.getByRole('button', { name: 'Create key' }).click();
	await page
		.getByRole('dialog', { name: 'Key created — copy it now' })
		.getByRole('button', {
			name: 'Done'
		})
		.click();
	await page.getByRole('row', { name: label }).getByRole('button', { name: 'Revoke' }).click();
	await page
		.getByRole('alertdialog', { name: 'Revoke API key' })
		.getByRole('button', { name: 'Revoke key' })
		.click();
	await expect(
		page.getByText(`Revoked ${label}. Any client using it will fail immediately.`)
	).toBeVisible();
	await expect(
		page.getByRole('row', { name: label }).getByText('revoked', { exact: true })
	).toBeVisible();
});

test('settings: the low-balance switch is a switch, and saving says so in a toast', async ({
	page,
	context
}) => {
	await signedIn(context);
	await page.goto('/settings');
	await page.waitForLoadState('networkidle');
	const toggle = page.getByRole('switch', { name: 'Low-balance alerts' });
	await expect(toggle).toBeChecked();
	try {
		await toggle.focus();
		await page.keyboard.press('Space');
		await expect(toggle).not.toBeChecked();
		await page.getByRole('button', { name: 'Save preferences' }).click();
		await expect(page.getByText('Preferences saved.')).toBeVisible();
		await page.reload();
		await expect(page.getByRole('switch', { name: 'Low-balance alerts' })).not.toBeChecked();
	} finally {
		// Put it back for the other tests, even when an assertion above failed after the first save.
		await page.goto('/settings');
		await page.waitForLoadState('networkidle');
		const restore = page.getByRole('switch', { name: 'Low-balance alerts' });
		if (!(await restore.isChecked())) {
			await restore.check();
			await page.getByRole('button', { name: 'Save preferences' }).click();
			await expect(page.getByText('Preferences saved.').first()).toBeVisible();
		}
	}
});

test('settings: deleting the account asks once more in an Alert Dialog', async ({
	page,
	context
}) => {
	await signedIn(context);
	await page.goto('/settings');
	await page.waitForLoadState('networkidle');
	const remove = page.getByRole('button', { name: 'Delete account' });
	await expect(remove).toBeDisabled();
	await page.getByLabel('Type you@example.com to confirm').fill('you@example.com');
	await remove.click();
	const dialog = page.getByRole('alertdialog', { name: 'Delete this account?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Keep account' }).click();
	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(/\/settings$/);
});
