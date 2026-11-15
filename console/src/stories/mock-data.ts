/**
 * Mocked data for the stories, read through the console's own mock adapter and fixtures.
 * Nothing here touches the network: `createMockAdapter` returns fixtures and in-memory copies.
 *
 * Plans are credits now (AudioKit decision 0052): Free is 100 credits a month.
 */

import { createMockAdapter } from '#lib/mock-adapter';
import { FREE_CREDITS_PER_MONTH } from '#lib/credits';
import type { Account, Credits, UsageSummary } from '#lib/types';

export { FREE_CREDITS_PER_MONTH };

const api = createMockAdapter({ now: () => new Date('2026-11-14T12:00:00.000Z') });

export const account: Account = await api.getAccount();
export const usage: UsageSummary = await api.getUsage();
export const recentJobs = await api.getRecentJobs(5);
export const apiKeys = await api.getApiKeys();
export const apiVersion = '0.1';

/** Credits spent so far this month, from the fixture's usage count. */
export const creditsUsed: number = usage.jobsUsed;
export const creditsLeft: number = FREE_CREDITS_PER_MONTH - creditsUsed;

/** A balance with plenty left, so the shell shows no banner. As billing answers before
 * epsilon-billing#81: no low-balance state. */
export const roomyCredits: Credits = { balance: creditsLeft };

/** Nothing left: new jobs are refused until the next monthly Free credits (0052). */
export const emptyCredits: Credits = { balance: 0 };

/** Billing's full answer from the mock adapter: lots, movements, no packs, and `low` (16 < 20). */
export const detailedCredits: Credits = await api.getCredits();

/** With billing's low-balance state (epsilon-billing#81): below the 20-credit threshold. */
export const lowCredits: Credits = {
	balance: 12,
	lowBalance: {
		state: 'low',
		threshold: 20,
		since: '2026-11-14T10:22:00.000Z',
		emailsEnabled: false,
		emailsOptedIn: true
	}
};

/** With billing's low-balance state at zero. */
export const emptyCreditsWithState: Credits = {
	balance: 0,
	lowBalance: {
		state: 'empty',
		threshold: 20,
		since: '2026-11-14T11:40:00.000Z',
		emailsEnabled: false,
		emailsOptedIn: true
	}
};

/** A purchased lot that never expires (0074) and a pack on sale, as billing will answer later. */
export const creditsWithPurchase: Credits = {
	balance: 1016,
	lots: [
		...(detailedCredits.lots ?? []),
		{
			source: 'purchase',
			credits: 1000,
			remaining: 1000,
			expiresAt: null,
			pack: 'credits_1000',
			createdAt: '2026-11-14T09:00:00.000Z'
		}
	],
	entries: detailedCredits.entries,
	packs: [{ pack: 'credits_1000', credits: 1000, priceCents: 1000, currency: 'usd' }],
	lowBalance: {
		state: 'ok',
		threshold: 20,
		since: null,
		emailsEnabled: false,
		emailsOptedIn: true
	}
};
