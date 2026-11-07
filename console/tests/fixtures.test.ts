import { describe, expect, it } from 'vitest';
import {
	account,
	apiBaseUrl,
	apiKeys,
	apiVersion,
	billing,
	notificationPreferences,
	plans,
	recentJobs,
	usage
} from '../src/lib/fixtures';

describe('plans', () => {
	it('matches the freemium Free / Pro / Enterprise catalogue', () => {
		expect(plans.map((plan) => plan.id)).toEqual(['free', 'pro', 'enterprise']);
		expect(plans.find((plan) => plan.id === 'free')?.jobLimit).toBe(100);
		expect(plans.find((plan) => plan.id === 'pro')?.jobLimit).toBe(1_000);
		expect(plans.find((plan) => plan.id === 'enterprise')?.jobLimit).toBe(5_000);
		expect(plans.find((plan) => plan.id === 'enterprise')?.priceMonthly).toBeNull();
	});

	// Decision 0027: a stem over the sub-cap is billed at the stem rate only. The mock and the
	// service-backed card have to say the same thing.
	it('prices stems at the stem rate and says they are not billed twice', () => {
		const copy = (plans.find((plan) => plan.id === 'pro')?.features ?? []).join(' ');

		expect(copy).toMatch(/\$0\.15 per stem and \$0\.01 per other job/);
		expect(copy).toMatch(/never both on one stem/);
		expect(copy).not.toMatch(/\$0\.16/);
	});
});

describe('usage', () => {
	it('has a current period whose daily and per-operation counts agree', () => {
		const dailyTotal = usage.daily.reduce((sum, day) => sum + day.jobs, 0);
		const operationTotal = usage.byOperation.reduce((sum, row) => sum + row.jobs, 0);

		expect(dailyTotal).toBe(usage.jobsUsed);
		expect(operationTotal).toBe(usage.jobsUsed);
	});

	// Stems are a sub-cap of the job allowance (decision 0023), not extra usage, so the stem
	// numbers must be a subset of the job numbers and must agree with the operation breakdown.
	it('states a stem allowance that is consistent with the job total', () => {
		expect(usage.stemLimit).not.toBeNull();
		expect(usage.stemsUsed).toBeLessThanOrEqual(usage.jobsUsed);
		expect(usage.stemsUsed).toBeLessThanOrEqual(usage.stemLimit as number);

		const stemsRow = usage.byOperation.find((row) => row.operation === 'stems');
		expect(stemsRow?.jobs, 'byOperation must account for the same stem jobs the meter shows').toBe(
			usage.stemsUsed
		);
		expect(usage.stemsOverage).toBe(0);
	});

	it('covers 12 periods of history, newest first', () => {
		expect(usage.history).toHaveLength(12);
		expect(usage.history[0].period).toBe('Nov 2026');
		expect(usage.history[11].period).toBe('Dec 2025');
	});
});

describe('generic fixtures', () => {
	it('uses example identity and key prefixes only', () => {
		expect(account.email).toBe('you@example.com');
		expect(account.name).toBe('Example User');
		expect(recentJobs.every((job) => /^[0-9a-f]{8}$/.test(job.id))).toBe(true);
		expect(apiKeys.every((key) => key.prefix.startsWith('ak_live_…'))).toBe(true);
	});

	it('keeps the API host and version in one place', () => {
		expect(apiBaseUrl).toBe('https://api.audiokit.ai');
		expect(apiVersion).toBe('0.1');
	});

	it('starts on Free with no invoices and only transactional email on', () => {
		expect(billing.plan).toBe('free');
		expect(billing.paymentMethod).toBeNull();
		expect(billing.invoices).toEqual([]);
		expect(notificationPreferences).toEqual({
			quotaWarnings: true,
			paymentReceipts: true,
			productUpdates: false
		});
	});
});
