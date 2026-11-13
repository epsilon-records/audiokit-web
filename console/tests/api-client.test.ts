import { describe, expect, it } from 'vitest';
import { createApiClient, MockApiError } from '../src/lib/api-client';
import { decodeToken, isMockToken } from '../src/lib/mock-adapter';

const fixedNow = () => new Date('2026-11-14T12:00:00.000Z');
const newClient = () => createApiClient({ adapter: 'mock', now: fixedNow });

describe('mock client: reads', () => {
	it('returns generic, deterministic fixtures', async () => {
		const client = newClient();
		const account = await client.getAccount();
		const usage = await client.getUsage();

		expect(account.email).toBe('you@example.com');
		expect(account.plan).toBe('free');
		expect(usage.jobsUsed).toBe(84);
		expect(usage.jobLimit).toBe(100);
	});

	it('reports the credit balance', async () => {
		expect(await newClient().getCredits()).toEqual({ balance: 16 });
	});

	it('limits recent jobs', async () => {
		const client = newClient();
		expect(await client.getRecentJobs()).toHaveLength(5);
		expect(await client.getRecentJobs(2)).toHaveLength(2);
	});
});

describe('mock client: email magic link', () => {
	it('normalises the email and produces a usable mock link', async () => {
		const client = newClient();
		const result = await client.requestMagicLink('  YOU@Example.COM ', { next: '/usage' });

		expect(result.sent).toBe(true);
		expect(result.email).toBe('you@example.com');
		expect(result.expiresAt).toBe('2026-11-14T12:10:00.000Z');
		expect(result.devLink).toContain('/auth/callback?token=');
		expect(result.devLink).toContain('next=%2Fusage');
	});

	it('rejects anything that is not an email address', async () => {
		const client = newClient();
		await expect(client.requestMagicLink('not-an-email')).rejects.toMatchObject({
			name: 'MockApiError',
			code: 'invalid-email'
		});
		await expect(client.requestMagicLink('not-an-email')).rejects.toBeInstanceOf(MockApiError);
	});

	it('exchanges a token for a session and resolves the cookie without a round trip', async () => {
		const client = newClient();
		const request = await client.requestMagicLink('person@example.com');
		const token = new URL(request.devLink!, 'https://console.test').searchParams.get('token')!;

		const exchange = await client.exchangeMagicLink(token);
		expect(exchange.ok).toBe(true);
		if (!exchange.ok) throw new Error('expected ok');
		expect(exchange.session.email).toBe('person@example.com');
		expect(exchange.token).toBe(token);
		expect(client.parseSessionToken(token)?.email).toBe('person@example.com');
	});

	it('rejects invalid and missing tokens', async () => {
		const client = newClient();
		expect(await client.exchangeMagicLink('nope')).toEqual({
			ok: false,
			error: 'invalid-token'
		});
		expect(await client.exchangeMagicLink('mock.not%40an%40email')).toEqual({
			ok: false,
			error: 'invalid-token'
		});
		expect(client.parseSessionToken(null)).toBeNull();
		expect(client.parseSessionToken(undefined)).toBeNull();
	});

	it('token helpers agree on the format', () => {
		expect(isMockToken('mock.you%40example.com')).toBe(true);
		expect(isMockToken('real-session-token')).toBe(false);
		expect(decodeToken('mock.you%40example.com')).toBe('you@example.com');
		expect(decodeToken('mock.%E0%A4%A')).toBeNull();
	});
});

describe('mock client: API keys', () => {
	it('creates a key with a one-time secret and lists only the prefix', async () => {
		const client = newClient();
		const created = await client.createApiKey(' staging ');

		expect(created.label).toBe('staging');
		expect(created.secret).toMatch(/^ak_live_[0-9a-f]{21}$/);
		expect(created.prefix).toBe(`ak_live_…${created.secret.slice(-3)}`);
		expect(created.revoked).toBe(false);

		const keys = await client.getApiKeys();
		expect(keys).toHaveLength(4);
		expect(keys[0]).toEqual({
			id: created.id,
			label: 'staging',
			prefix: created.prefix,
			createdAt: created.createdAt,
			lastUsedAt: null,
			revoked: false
		});
	});

	it('revokes a key and keeps it for audit', async () => {
		const client = newClient();
		const revoked = await client.revokeApiKey('key_0001');
		expect(revoked.revoked).toBe(true);
		expect((await client.getApiKeys()).find((key) => key.id === 'key_0001')?.revoked).toBe(true);
	});

	it('fails clearly on unknown or already-revoked keys', async () => {
		const client = newClient();
		await expect(client.revokeApiKey('missing')).rejects.toMatchObject({ code: 'not-found' });
		await expect(client.revokeApiKey('key_0003')).rejects.toMatchObject({
			code: 'already-revoked'
		});
	});
});

describe('mock client: settings', () => {
	it('updates the profile and notification preferences', async () => {
		const client = newClient();
		const account = await client.updateProfile('  Example Person ');
		expect(account.name).toBe('Example Person');
		expect((await client.getAccount()).name).toBe('Example Person');

		const preferences = await client.updateNotificationPreferences({
			quotaWarnings: false,
			paymentReceipts: true,
			productUpdates: true
		});
		expect(preferences.productUpdates).toBe(true);
		expect((await client.getNotificationPreferences()).quotaWarnings).toBe(false);
	});

	it('has no billing portal in mock mode', async () => {
		await expect(newClient().createBillingPortal()).rejects.toMatchObject({
			code: 'not-supported'
		});
	});
});

describe('mock client: account deletion', () => {
	it('only accepts the account address', async () => {
		const client = newClient();
		const { email } = await client.getAccount();
		await expect(client.deleteAccount('someone@else.test')).rejects.toMatchObject({
			code: 'invalid-request'
		});
		await expect(client.deleteAccount(email.toUpperCase())).resolves.toBeUndefined();
	});
});
