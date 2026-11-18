import { expect, test } from '@playwright/test';

for (const route of ['/', '/pricing/', '/docs/', '/docs/reference/', '/privacy/']) {
  test(`${route} fits a phone with visible content and reachable navigation`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The shared sign-in action is present on every public page; do not navigate to the console.
    await expect(page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    if (route === '/' || route === '/pricing/') {
      await expect(page.locator('main').getByRole('link', { name: 'Start free', exact: true }).first()).toBeVisible();
    }
    expect(await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))).toEqual({ content: 393, viewport: 393 });
    const nav = page.getByRole('navigation', { name: 'Main', exact: true });
    await nav.getByRole('link', { name: 'Get started', exact: true }).click();
    await expect(page).toHaveURL(/\/docs\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Run your first job' })).toBeVisible();
  });
}

test.fixme('terms fits a phone', async () => {
  // No public terms page exists on main. Requires approved legal copy outside this CSS-only issue.
  // Tracked in epsilon-records/knowledge#200.
});
