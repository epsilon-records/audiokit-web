import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import consoleShell from '../src/lib/components/ConsoleShell.svelte?raw';
import dashboardPage from '../src/routes/(app)/dashboard/+page.svelte?raw';
import billingPage from '../src/routes/(app)/settings/billing/+page.svelte?raw';
import welcome from '../src/lib/components/Welcome.svelte?raw';
import signupPage from '../src/routes/signup/+page.svelte?raw';
import loginPage from '../src/routes/login/+page.svelte?raw';

/**
 * The console states prepaid credits, the same way audiokit.ai/pricing/ does. The console's own
 * plan page (/pricing) went in EPSILON-169 PR 2: the public pricing page is now part of this app
 * (src/lib/site/pages/pricing.html, checked by tests/site/pricing-copy.test.ts), and /credits
 * replaces the plan page in PR 3.
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

const routes = new URL('../src/routes/', import.meta.url).pathname;
function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}
const serverFiles = walk(routes).filter((f) => /\+(page|layout)\.server\.ts$/.test(f));

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

// epsilon-billing#59 (EPSILON-157): jobs spend credits, POST /v1/subscriptions/checkout and
// GET /v1/usage/quota answer 404, and Free has no job or stem quota.
describe('Free copy under prepaid credits', () => {
	it('no console route starts a subscription Checkout', () => {
		expect(serverFiles.length).toBeGreaterThan(0);
		for (const file of serverFiles) {
			expect(readFileSync(file, 'utf8'), file).not.toMatch(/startCheckout|upgrade/);
		}
	});

	for (const [name, source] of [
		['Welcome', welcome],
		['signup', signupPage],
		['login', loginPage],
		['settings/billing', billingPage]
	] as const) {
		it(`${name} states the Free credits, not a job or stem quota`, () => {
			// Markup with attributes kept: the auth cards put this copy in a `subtitle` prop.
			const copy = source
				.replace(/<script[\s\S]*?<\/script>/g, ' ')
				.replace(/<!--[\s\S]*?-->/g, ' ');
			expect(copy).toMatch(/100 credits|Free credits/);
			expect(copy).not.toMatch(/\bjobs? ?(a|per|\/) ?month|stem separations/i);
		});
	}
});
