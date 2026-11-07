import { describe, expect, it } from 'vitest';
import { createApiClient } from '../src/lib/api-client';
import { plans as mockPlans } from '../src/lib/fixtures';

/**
 * The console renders plan cards from two sources: the mock fixtures (no billing URL) and the
 * billing service's subscription_plans rows (http adapter). A customer can see either, so the
 * pricing lines must not drift apart — that is how the card came to imply a stem separation
 * costs $0.01 while the marketing page said $0.15.
 *
 * Only the money lines are compared. The mock lists marketing extras ("All analysis operations")
 * that the adapter derives from plan booleans, and those are allowed to differ.
 */

const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});

// The plan rows as decision 0023 settles them, in the shape /v1/subscriptions/plans returns.
const rows = [
	{
		tier: 'free',
		name: 'Free',
		price_monthly_cents: 0,
		monthly_job_quota: 100,
		overage_price_cents: null,
		monthly_stem_quota: 10,
		stem_overage_price_cents: null,
		priority_processing: false,
		email_support: false,
		sla_uptime_percentage: null
	},
	{
		tier: 'pro',
		name: 'Pro',
		price_monthly_cents: 9900,
		monthly_job_quota: 1000,
		overage_price_cents: 1,
		monthly_stem_quota: 250,
		stem_overage_price_cents: 15,
		priority_processing: true,
		email_support: true,
		sla_uptime_percentage: '99.9'
	},
	{
		tier: 'enterprise',
		name: 'Enterprise',
		price_monthly_cents: 49900,
		monthly_job_quota: 5000,
		overage_price_cents: null,
		monthly_stem_quota: 1500,
		stem_overage_price_cents: 8,
		priority_processing: true,
		email_support: true,
		sla_uptime_percentage: '99.99'
	}
];

async function servicePlans() {
	const client = createApiClient({
		baseUrl: 'https://billing.test',
		sessionToken: 'session-token',
		fetch: (async () => jsonResponse({ plans: rows })) as typeof fetch
	});
	return client.getPlans();
}

/** The lines that state a number a customer is charged or allowed. */
const moneyLines = (features: string[]) =>
	features
		.filter((line) => /job|stem|overage|\$|limit/i.test(line))
		// Normalise the thousand separators so "1,000" and "1,000" from either side agree.
		.map((line) => line.toLowerCase().replace(/\s+/g, ' '));

describe('plan cards: mock and service agree', () => {
	it('both sources exist to be compared', async () => {
		const service = await servicePlans();
		expect(service.map((plan) => plan.id)).toEqual(['free', 'pro', 'enterprise']);
		expect(mockPlans.map((plan) => plan.id)).toEqual(['free', 'pro', 'enterprise']);
	});

	for (const id of ['free', 'pro', 'enterprise'] as const) {
		it(`the ${id} stem allowance is stated the same way in both`, async () => {
			const service = (await servicePlans()).find((plan) => plan.id === id)!;
			const mock = mockPlans.find((plan) => plan.id === id)!;

			const stemsOf = (features: string[]) =>
				features.filter((line) => /stem/i.test(line)).map((line) => line.toLowerCase());

			// Every number in a stem line must appear identically on both cards.
			const numbers = (lines: string[]) =>
				lines.flatMap((line) => line.match(/[\d,]+/g) ?? []).sort();

			expect(
				numbers(stemsOf(service.features)),
				`service ${id}: ${stemsOf(service.features)} vs mock ${stemsOf(mock.features)}`
			).toEqual(numbers(stemsOf(mock.features)));
		});
	}

	// Decision 0027: a line that quotes rates must say the stem rate replaces the job rate.
	// A line that quotes no rate ("Volume overage per agreement") needs no such qualifier.
	it('any overage line that quotes a rate says the stem is billed once', async () => {
		const service = await servicePlans();
		const quoted = [...service, ...mockPlans]
			.flatMap((plan) => moneyLines(plan.features).map((line) => [plan.id, line] as const))
			.filter(([, line]) => /overage/.test(line) && /\$\d/.test(line));

		expect(
			quoted.length,
			'expected at least the Pro overage line from each source'
		).toBeGreaterThanOrEqual(2);
		for (const [id, line] of quoted) {
			expect(line, `${id} quotes rates without the single-charge rule: "${line}"`).toMatch(
				/never both|billed once|other job/
			);
		}
	});

	it('the service-backed Free card carries no overage line, like the mock', async () => {
		const service = (await servicePlans()).find((plan) => plan.id === 'free')!;
		const mock = mockPlans.find((plan) => plan.id === 'free')!;

		expect(moneyLines(service.features).filter((line) => /overage/.test(line))).toEqual([]);
		expect(moneyLines(mock.features).filter((line) => /overage/.test(line))).toEqual([]);
	});

	it('Enterprise quotes no rate, on either path', async () => {
		// 0023: volume overage is per agreement. The seeded $0.08 must not reach the card.
		const service = (await servicePlans()).find((plan) => plan.id === 'enterprise')!;
		const mock = mockPlans.find((plan) => plan.id === 'enterprise')!;

		expect(moneyLines(service.features).join(' ')).toContain('volume overage per agreement');
		expect(moneyLines(service.features).join(' ')).not.toMatch(/\$0\.\d\d/);
		expect(moneyLines(mock.features).join(' ')).not.toMatch(/\$0\.\d\d/);
	});

	it('Enterprise is priced by sales on both paths', async () => {
		const service = (await servicePlans()).find((plan) => plan.id === 'enterprise')!;
		const mock = mockPlans.find((plan) => plan.id === 'enterprise')!;

		expect(service.priceMonthly).toBeNull();
		expect(mock.priceMonthly).toBeNull();
	});
});
