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
});

describe('usage', () => {
	it('has a current period whose daily and per-operation counts agree', () => {
		const dailyTotal = usage.daily.reduce((sum, day) => sum + day.jobs, 0);
		const operationTotal = usage.byOperation.reduce((sum, row) => sum + row.jobs, 0);

		expect(dailyTotal).toBe(usage.jobsUsed);
		expect(operationTotal).toBe(usage.jobsUsed);
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
