import { test, expect } from '@playwright/test';

// Browser smoke tests deliberately use the console's mock adapter.
// Stripe-hosted Checkout and billing lifecycle are tested separately with
// Stripe test mode and test clocks; these tests must never charge a card.
test('passwordless signup creates a Free account and opens pricing', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Create your AudioKit account' })).toBeVisible();
  await page.getByLabel('Email').fill('stripe-e2e@example.test');
  await page.getByRole('button', { name: 'Email me a signup link' }).click();
  await expect(page.getByText('Mock mode: no email is sent.')).toBeVisible();
  await page.getByRole('link', { name: 'Open the magic link' }).click();
  await page.goto('/pricing');
  await expect(page.getByText('100 jobs a month', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible();
});

test('signed-out users cannot access billing settings', async ({ page }) => {
  await page.goto('/settings/billing');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});
