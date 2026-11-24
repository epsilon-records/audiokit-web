import { test, expect } from '@playwright/test';

// A saved preferences form keeps showing what was saved. The form used to reset after each save,
// which drew the low-balance switch as off although it was stored on; the next save then sent off.
// Mock adapter only.

test.use({ video: 'off', trace: 'off' });

test.beforeEach(async ({ context, baseURL }) => {
	await context.addCookies([
		{ name: 'ak_console_session', value: 'mock.you%40example.com', url: baseURL }
	]);
});

async function save(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Save preferences' }).click();
	await expect(page.getByText('Preferences saved.').first()).toBeVisible();
	await page.waitForLoadState('networkidle');
}

test('settings: saving twice without a change leaves the low-balance switch on', async ({
	page
}) => {
	await page.goto('/settings');
	const lowBalance = page.locator('#lowBalanceAlerts');
	await expect(lowBalance).toBeChecked();

	await save(page);
	await expect(lowBalance).toBeChecked();
	await save(page);
	await expect(lowBalance).toBeChecked();

	await page.reload();
	await expect(page.locator('#lowBalanceAlerts')).toBeChecked();
});

for (const id of ['lowBalanceAlerts', 'productUpdates', 'paymentReceipts']) {
	test(`settings: ${id} keeps a changed value after save and reload`, async ({ page }) => {
		await page.goto('/settings');
		const input = page.locator(`#${id}`);
		const before = await input.isChecked();

		await input.click();
		await save(page);
		await expect(input).toBeChecked({ checked: !before });
		await save(page);
		await expect(input).toBeChecked({ checked: !before });

		await page.reload();
		await expect(page.locator(`#${id}`)).toBeChecked({ checked: !before });

		// Put it back, so the mock's state is as the other tests expect.
		await page.locator(`#${id}`).click();
		await save(page);
		await expect(page.locator(`#${id}`)).toBeChecked({ checked: before });
	});
}
