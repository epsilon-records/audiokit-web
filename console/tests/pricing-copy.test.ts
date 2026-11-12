import { describe, expect, it } from 'vitest';
import pricingPage from '../src/routes/(console)/pricing/+page.svelte?raw';
import consoleShell from '../src/lib/components/ConsoleShell.svelte?raw';
import dashboardPage from '../src/routes/(console)/dashboard/+page.svelte?raw';
import billingPage from '../src/routes/(console)/settings/billing/+page.svelte?raw';

/**
 * The console's plan page states prepaid credits, the same way audiokit.ai/pricing does
 * (`test/pricing-copy.test.mjs` at the repo root checks that page).
 *
 * AudioKit 0052: credits replace the Pro and Enterprise subscriptions. 0057: packs are
 * non-refundable. 0058: billing's subscription Checkout is removed, so nothing here may post to
 * it. Shared 0040: no sales until credits ship and no uptime SLA claim.
 */

const textOf = (svelte: string) =>
	svelte
		.replace(/<script[\s\S]*?<\/script>/g, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const page: string = pricingPage;
const markup = page.replace(/<script[\s\S]*?<\/script>/g, ' ');
const text = textOf(page);

describe('console plan page: prepaid credits only', () => {
	it('offers no subscription plan, price or SLA', () => {
		expect(text).not.toMatch(/\bPro\b|\bEnterprise\b/);
		expect(text).not.toMatch(/\bSLA\b|uptime/i);
		expect(text).not.toMatch(/\$99\b|\$990|\$499|\$0\.15|overage|priority/i);
	});

	it('states the credit price, the Free allowance, every pack and every rate (0052)', () => {
		expect(page).toContain('One credit is $0.01');
		expect(text).toContain('100 credits each calendar month (UTC)');
		for (const pack of [
			'$10 for 1,000 credits',
			'$50 for 5,500 credits',
			'$200 for 24,000 credits'
		]) {
			expect(text).toContain(pack);
		}
		expect(text).toContain('valid for 12 months after purchase');
		expect(text).toMatch(
			/probe , loudness , waveform , tempo , key , fingerprint , tags 1 per track/
		);
		expect(text).toContain('analyze bundle 3 per track');
		expect(text).toContain('stems 3 per audio minute, metered per second, at least 10 per job');
		expect(text).toMatch(/transcode , preview , normalize 1 per audio minute/);
	});

	it('says packs are non-refundable (0057)', () => {
		expect(text).toContain('Credit packs are non-refundable');
	});

	it('keeps the beta note from the pricing page', () => {
		expect(text).toContain('Credit packs open soon.');
		expect(text).toContain(
			'Until credits are switched on, a Free account runs on the current allowance of 100 jobs a month, 10 of them stem separations.'
		);
	});

	it('has nothing to buy: no form, button or checkout (0058, shared 0040)', () => {
		expect(markup).not.toMatch(/<form\b|<button\b|use:enhance/);
		expect(markup).not.toMatch(/checkout|upgrade/i);
	});
});

describe('upsell links elsewhere in the console', () => {
	for (const [name, source] of [
		['ConsoleShell', consoleShell],
		['dashboard', dashboardPage],
		['settings/billing', billingPage]
	] as const) {
		it(`${name} does not offer Pro or an upgrade`, () => {
			const copy = textOf(source);
			expect(copy).not.toMatch(/\bPro\b|upgrade/i);
		});
	}
});
