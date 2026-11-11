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
  await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
});

test('signed-out users cannot access billing settings', async ({ page }) => {
  await page.goto('/settings/billing');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

// EPSILON-124: the webhook secret is revealed once, beside the key, on both reveal screens.
test('signup reveals the default key and its webhook secret once', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('webhook-secret-e2e@example.test');
  await page.getByRole('button', { name: 'Email me a signup link' }).click();
  await page.getByRole('link', { name: 'Open the magic link' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to AudioKit' })).toBeVisible();
  await expect(page.getByText('Webhook secret', { exact: true })).toBeVisible();
  await expect(page.locator('pre.code', { hasText: /^whsec_mock_[0-9a-f]{32}$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy webhook secret' })).toBeVisible();
});

test('creating a key reveals its webhook secret beside it, and the list never shows it', async ({
  page
}) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('webhook-secret-keys-e2e@example.test');
  await page.getByRole('button', { name: 'Email me a signup link' }).click();
  await page.getByRole('link', { name: 'Open the magic link' }).click();
  await page.goto('/api-keys');
  // The route may still be hydrating after goto; a click before then does nothing.
  await page.waitForLoadState('networkidle');
  const createDialog = page.getByRole('dialog', { name: 'Create API key' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Create key' }).first().click();
    await expect(createDialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page.getByLabel('Label (optional)').fill('webhooks');
  await createDialog.getByRole('button', { name: 'Create key' }).click();
  const reveal = page.getByRole('dialog', { name: 'Key created — copy it now' });
  await expect(reveal.getByText('Webhook secret', { exact: true })).toBeVisible();
  const secret = reveal.locator('pre.code', { hasText: /^whsec_mock_/ });
  await expect(secret).toBeVisible();
  const value = (await secret.textContent())!.trim();
  const key = (await reveal.locator('pre.code', { hasText: /^ak_/ }).textContent())!.trim();
  await reveal.getByRole('button', { name: 'Done' }).click();
  await expect(reveal).toBeHidden();
  // Done drops the reveal: neither the key nor its webhook secret stays in the DOM.
  await expect(page.getByText(value)).toHaveCount(0);
  await expect(page.getByText(key)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(value)).toHaveCount(0);
});
