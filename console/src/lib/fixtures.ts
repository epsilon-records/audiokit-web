/**
 * Static fixtures for the mock-first console.
 *
 * Nothing here talks to a backend. The shapes match `types.ts`, so replacing the
 * mock adapter with an HTTP one is the only change needed when the billing
 * service lands. Values are generic and deterministic — `you@example.com`,
 * `ak_live_…`, `a1b2c3d4` — so the build is reproducible and no client data is
 * committed (docs/console/component-inventory.md §10).
 */

import type {
	Account,
	Credits,
	ApiKey,
	BillingSummary,
	Job,
	NotificationPreferences,
	Plan,
	UsageSummary
} from './types';

export const account: Account = {
	id: 'acct_mock_0001',
	name: 'Example User',
	email: 'you@example.com',
	emailVerified: true,
	plan: 'free',
	renewsAt: '2026-12-01T00:00:00.000Z'
};

export const plans: Plan[] = [
	{
		id: 'free',
		name: 'Free',
		priceMonthly: 0,
		priceLabel: '$0',
		jobLimit: 100,
		features: [
			'100 credits / month',
			'All analysis operations',
			'All processing operations',
			'Webhook delivery',
			'Community support'
		]
	},
	{
		id: 'pro',
		name: 'Pro',
		priceMonthly: 99,
		priceLabel: '$99',
		jobLimit: 1_000,
		features: [
			'250 stem separations included',
			'Priority processing',
			'Overage at $0.15 per stem and $0.01 per other job, never both on one stem',
			'Email support'
		],
		featured: true
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		priceMonthly: null,
		priceLabel: 'From $499',
		jobLimit: 5_000,
		features: [
			'1,500 stem separations included',
			'Priority processing',
			'Dedicated support',
			'Custom terms'
		],
		delta: 'Talk to us about volume and support'
	}
];

export const recentJobs: Job[] = [
	{
		id: 'a1b2c3d4',
		operation: 'analyze',
		status: 'succeeded',
		createdAt: '2026-11-14T12:01:00.000Z'
	},
	{
		id: 'e5f6a7b8',
		operation: 'transcode',
		status: 'running',
		createdAt: '2026-11-14T11:58:00.000Z'
	},
	{
		id: 'c9d0e1f2',
		operation: 'tags',
		status: 'failed',
		createdAt: '2026-11-14T11:40:00.000Z'
	},
	{
		id: 'f3a4b5c6',
		operation: 'loudness',
		status: 'succeeded',
		createdAt: '2026-11-14T10:22:00.000Z'
	},
	{
		id: 'd7e8f9a0',
		operation: 'probe',
		status: 'succeeded',
		createdAt: '2026-11-14T09:15:00.000Z'
	}
];

/** Free's 100 credits less the 84 jobs the usage fixture counts at one credit each. */
export const credits: Credits = { balance: 16 };

export const usage: UsageSummary = {
	periodStart: '2026-11-01T00:00:00.000Z',
	periodEnd: '2026-11-30T23:59:59.000Z',
	jobsUsed: 84,
	jobLimit: 100,
	stemsUsed: 6,
	stemLimit: 10,
	stemsOverage: 0,
	daily: [
		{ date: '2026-11-01', jobs: 4 },
		{ date: '2026-11-02', jobs: 7 },
		{ date: '2026-11-03', jobs: 5 },
		{ date: '2026-11-04', jobs: 9 },
		{ date: '2026-11-05', jobs: 12 },
		{ date: '2026-11-06', jobs: 6 },
		{ date: '2026-11-07', jobs: 3 },
		{ date: '2026-11-08', jobs: 8 },
		{ date: '2026-11-09', jobs: 11 },
		{ date: '2026-11-10', jobs: 5 },
		{ date: '2026-11-11', jobs: 4 },
		{ date: '2026-11-12', jobs: 2 },
		{ date: '2026-11-13', jobs: 6 },
		{ date: '2026-11-14', jobs: 2 }
	],
	byOperation: [
		{ operation: 'analyze', jobs: 28 },
		{ operation: 'stems', jobs: 6 },
		{ operation: 'transcode', jobs: 21 },
		{ operation: 'tags', jobs: 12 },
		{ operation: 'loudness', jobs: 9 },
		{ operation: 'other', jobs: 8 }
	],
	history: [
		{ period: 'Nov 2026', jobs: 84, limit: 100, status: 'within quota' },
		{ period: 'Oct 2026', jobs: 92, limit: 100, status: 'within quota' },
		{ period: 'Sep 2026', jobs: 100, limit: 100, status: 'quota reached' },
		{ period: 'Aug 2026', jobs: 61, limit: 100, status: 'within quota' },
		{ period: 'Jul 2026', jobs: 44, limit: 100, status: 'within quota' },
		{ period: 'Jun 2026', jobs: 28, limit: 100, status: 'within quota' },
		{ period: 'May 2026', jobs: 9, limit: 100, status: 'within quota' },
		{ period: 'Apr 2026', jobs: 0, limit: 100, status: 'within quota' },
		{ period: 'Mar 2026', jobs: 0, limit: 100, status: 'within quota' },
		{ period: 'Feb 2026', jobs: 0, limit: 100, status: 'within quota' },
		{ period: 'Jan 2026', jobs: 0, limit: 100, status: 'within quota' },
		{ period: 'Dec 2025', jobs: 0, limit: 100, status: 'within quota' }
	]
};

export const apiKeys: ApiKey[] = [
	{
		id: 'key_0001',
		label: 'production',
		prefix: 'ak_live_…4f2',
		createdAt: '2026-11-01T09:00:00.000Z',
		lastUsedAt: '2026-11-14T12:01:00.000Z',
		revoked: false
	},
	{
		id: 'key_0002',
		label: 'laptop',
		prefix: 'ak_live_…9c1',
		createdAt: '2026-11-03T14:30:00.000Z',
		lastUsedAt: '2026-11-12T18:20:00.000Z',
		revoked: false
	},
	{
		id: 'key_0003',
		label: 'ci',
		prefix: 'ak_live_…77a',
		createdAt: '2026-10-28T08:10:00.000Z',
		lastUsedAt: null,
		revoked: true
	}
];

export const billing: BillingSummary = {
	plan: 'free',
	renewsAt: '2026-12-01T00:00:00.000Z',
	paymentMethod: null,
	invoices: [],
	portalUrl: null
};

export const notificationPreferences: NotificationPreferences = {
	quotaWarnings: true,
	paymentReceipts: true,
	productUpdates: false
};

/** The API base URL shown in quick-start snippets. Mirrors site.config.mjs. */
export const apiBaseUrl = 'https://api.audiokit.ai';
export const apiVersion = '0.1';
