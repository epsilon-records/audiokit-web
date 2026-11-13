import { describe, expect, it } from 'vitest';
import { createApiClient } from '../src/lib/api-client';

/**
 * Decision 0031: every success body names its resources under a key. The console ships first, so
 * between the console deploy and the service deploy — and after any rollback — it meets both the
 * named shape and the pre-0031 shape. Every call below is asserted against both, producing the
 * same result. A client that only passes the new shape would be a deploy-order trap.
 */

function jsonResponse(body: unknown, status = 200): Response {
	// A 204 must carry a null body, not an empty string: `new Response('', { status: 204 })` throws,
	// which the adapter would (correctly) report as a network failure rather than an empty result.
	return new Response(body === undefined ? null : JSON.stringify(body), {
		status,
		headers: body === undefined ? {} : { 'content-type': 'application/json' }
	});
}

function clientFor(build: (url: string) => Response) {
	return createApiClient({
		baseUrl: 'https://billing.test',
		sessionToken: 'session-token',
		fetch: (async (_input: RequestInfo | URL, init: RequestInit = {}) => {
			const url = typeof _input === 'string' ? _input : _input.toString();
			return build(url);
		}) as typeof fetch
	});
}

// The two bodies the service can answer for GET /v1/usage/current.
const usageFields = {
	tier: 'pro',
	jobCount: 120,
	jobCountByOperation: { analyze: 70, transcode: 50 },
	quotaLimit: 1000,
	overageCount: 0,
	periodStart: '2026-11-01T00:00:00.000Z',
	periodEnd: '2026-11-30T23:59:59.000Z'
};
const daily = [{ date: '2026-11-02', count: 12 }];

describe('http adapter: envelope transition (decision 0031)', () => {
	it('reads usage from the named shape and the old spread shape alike', async () => {
		const legacy = { ...usageFields, daily }; // `{ ...usage, daily }`
		const named = { usage: { ...usageFields, daily } };

		const results = await Promise.all([
			clientFor(() => jsonResponse(legacy)).getUsage(),
			clientFor(() => jsonResponse(named)).getUsage()
		]);

		expect(results[0]).toEqual(results[1]);
		expect(results[0].jobsUsed).toBe(120);
		expect(results[0].daily).toEqual([{ date: '2026-11-02', jobs: 12 }]);
	});

	it('reads notification preferences bare or under `notifications`', async () => {
		const prefs = { quota_warnings: true, payment_receipts: false, product_updates: true };

		const bare = await clientFor(() => jsonResponse(prefs)).getNotificationPreferences();
		const named = await clientFor(() =>
			jsonResponse({ notifications: prefs })
		).getNotificationPreferences();

		expect(named).toEqual(bare);
		expect(named.quotaWarnings).toBe(true);
	});

	it('reads the portal URL bare or under `portal`', async () => {
		expect(await clientFor(() => jsonResponse({ url: 'https://portal.test/x' })).createBillingPortal()).toBe(
			'https://portal.test/x'
		);
		expect(
			await clientFor(() => jsonResponse({ portal: { url: 'https://portal.test/y' } })).createBillingPortal()
		).toBe('https://portal.test/y');
	});

	it('rejects a portal response with no URL instead of returning undefined', async () => {
		await expect(clientFor(() => jsonResponse({ portal: {} })).createBillingPortal()).rejects.toThrow();
	});

	// The discriminator case: the pre-0031 body is a bare object that ALREADY has an `api_key`
	// member (the secret string). Unwrapping on key presence alone would return the secret as the
	// resource and every field below would be undefined.
	it('reads a created key bare or under `api_key`, without mistaking the secret for the resource', async () => {
		const secret = 'ak_live_0123456789abcdef';
		const resource = {
			id: 'k1',
			name: 'CI',
			api_key: secret,
			key_prefix: 'ak_live_012',
			created_at: '2026-11-02T09:00:00.000Z'
		};

		const legacy = await clientFor((url) =>
			url.endsWith('/v1/api-keys') && !url.includes('?') ? jsonResponse(resource) : jsonResponse({ api_keys: [] })
		).createApiKey('CI');
		const named = await clientFor(() =>
			jsonResponse({ api_key: resource })
		).createApiKey('CI');

		expect(legacy).toEqual(named);
		expect(named.secret).toBe(secret);
		expect(named.id).toBe('k1');
		expect(named.prefix).toBe('ak_live_012');
	});

	it('tolerates a 204 with no body where `{ success: true }` used to be', async () => {
		const client = clientFor((url) =>
			url.includes('/v1/api-keys/k1') ? jsonResponse(undefined, 204) : jsonResponse({ api_keys: [] })
		);

		// The key is gone from the list, so the console reports it as missing rather than crashing
		// on an empty body — the list re-read is authoritative either way.
		await expect(client.revokeApiKey('k1')).rejects.toMatchObject({ code: 'not-found' });
	});

	it('leaves already-compliant plural bodies alone', async () => {
		const usage = await clientFor((url) =>
			url.includes('/v1/usage/history')
				? jsonResponse({ history: [] })
				: jsonResponse({ usage: { ...usageFields, daily: [] } })
		).getUsage();
		const keys = await clientFor(() => jsonResponse({ api_keys: [] })).getApiKeys();
		const plans = await clientFor(() => jsonResponse({ plans: [] })).getPlans();
		const jobs = await clientFor(() => jsonResponse({ jobs: [] })).getRecentJobs();

		expect([usage.jobsUsed, keys, plans, jobs]).toEqual([120, [], [], []]);
	});
});
