/**
 * Mocked data for the stories, read through the console's own mock adapter and fixtures.
 * Nothing here touches the network: `createMockAdapter` returns fixtures and in-memory copies.
 *
 * Plans are credits now (AudioKit decision 0052): Free is 100 credits a month. The fixtures
 * still carry the retired job-based plan copy that the console's tests pin, so the story copy
 * lives here and the fixtures stay as they are.
 */

import { createMockAdapter } from '#lib/mock-adapter';
import type { Account, Plan, UsageSummary } from '#lib/types';

const api = createMockAdapter({ now: () => new Date('2026-11-14T12:00:00.000Z') });

export const account: Account = await api.getAccount();
export const usage: UsageSummary = await api.getUsage();
export const recentJobs = await api.getRecentJobs(5);
export const apiKeys = await api.getApiKeys();
export const apiVersion = '0.1';

/** Free: 100 credits each calendar month (UTC), per 0052. */
export const FREE_CREDITS_PER_MONTH = 100;

/** The Free plan as the plan card shows it, in credits. `jobLimit` is the field the card reads. */
export const freePlan: Plan = {
	id: 'free',
	name: 'Free',
	priceMonthly: 0,
	priceLabel: '$0',
	jobLimit: FREE_CREDITS_PER_MONTH,
	features: [
		'100 credits every calendar month',
		'Unspent Free credits lapse at the end of the month',
		'Buy a credit pack when you need more',
		'Bought credits expire 12 months after purchase'
	]
};

/** Credits spent so far this month, from the fixture's usage count. */
export const creditsUsed: number = usage.jobsUsed;
export const creditsLeft: number = FREE_CREDITS_PER_MONTH - creditsUsed;

/** A usage summary with plenty of room left, so the shell shows no low-balance banner. */
export const roomyUsage: UsageSummary = {
	...usage,
	jobsUsed: 12,
	jobLimit: FREE_CREDITS_PER_MONTH
};
