/**
 * The mock adapter for the typed console client.
 *
 * It is the default adapter: `api-client.ts` picks it whenever
 * `PUBLIC_BILLING_API_URL` is unset, so local dev, tests and the build keep
 * working with no service. Every method returns fixtures or a small in-memory
 * mutation, and no method touches the network. The real adapter lives in
 * `http-adapter.ts` and implements the same `ConsoleApi` shape.
 *
 * Mutations live in module memory: they survive navigation in `vite dev` and in
 * a single long-lived server, but reset on a cold start. That is enough for the
 * scaffold and is documented in README.md.
 */

import * as fixtures from './fixtures';
import { ApiError } from './errors';
import type { ConsoleApi } from './api-client';
import type {
	Account,
	ApiKey,
	BillingSummary,
	CheckoutResult,
	CreatedApiKey,
	MagicLinkExchange,
	MagicLinkRequest,
	NotificationPreferences,
	PlanId,
	Session
} from './types';

/** A typed failure the screens can branch on, rather than a bare Error. */
export type MockApiErrorCode =
	'invalid-email' | 'not-found' | 'enterprise-contact' | 'already-revoked';

export class MockApiError extends ApiError {
	constructor(code: MockApiErrorCode, message: string) {
		super(code, message);
		this.name = 'MockApiError';
	}
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PREFIX = 'mock.';
const MAGIC_LINK_TTL_MS = 10 * 60 * 1000;

/** Mock magic-link tokens carry the email so a stateless callback can resolve them. */
function encodeToken(email: string): string {
	return `${TOKEN_PREFIX}${encodeURIComponent(email)}`;
}

export function isMockToken(token: string | null | undefined): boolean {
	return typeof token === 'string' && token.startsWith(TOKEN_PREFIX);
}

export function decodeToken(token: string | null | undefined): string | null {
	if (!isMockToken(token)) return null;
	try {
		const email = decodeURIComponent(token!.slice(TOKEN_PREFIX.length));
		return EMAIL_RE.test(email) ? email : null;
	} catch {
		return null;
	}
}

export type MockAdapterOptions = {
	/** Injectable clock so tests and fixtures are deterministic. */
	now?: () => Date;
};

export function createMockAdapter(options: MockAdapterOptions = {}): ConsoleApi {
	const now = options.now ?? (() => new Date());

	// Mutable copies of the fixtures: the mock is a demo, not a database.
	let account: Account = { ...fixtures.account };
	let keys: ApiKey[] = fixtures.apiKeys.map((key) => ({ ...key }));
	let billing: BillingSummary = {
		...fixtures.billing,
		invoices: fixtures.billing.invoices.map((invoice) => ({ ...invoice }))
	};
	let preferences: NotificationPreferences = { ...fixtures.notificationPreferences };

	function sessionFor(email: string): Session {
		return { email, issuedAt: now().toISOString() };
	}

	return {
		async requestMagicLink(email: string, requestOptions: { next?: string } = {}) {
			const normalised = email.trim().toLowerCase();
			if (!EMAIL_RE.test(normalised)) {
				throw new MockApiError('invalid-email', 'Enter a valid email address.');
			}

			const token = encodeToken(normalised);
			const next = requestOptions.next ? `&next=${encodeURIComponent(requestOptions.next)}` : '';
			const result: MagicLinkRequest = {
				sent: true,
				email: normalised,
				expiresAt: new Date(now().getTime() + MAGIC_LINK_TTL_MS).toISOString(),
				// Mock-only: skip the inbox. Never set by a real adapter.
				devLink: `/auth/callback?token=${encodeURIComponent(token)}${next}`
			};
			return result;
		},

		async exchangeMagicLink(token: string): Promise<MagicLinkExchange> {
			const email = decodeToken(token);
			if (!email) return { ok: false, error: 'invalid-token' };
			return { ok: true, session: sessionFor(email), token };
		},

		parseSessionToken(token: string | null | undefined): Session | null {
			const email = decodeToken(token);
			return email ? sessionFor(email) : null;
		},

		async getAccount() {
			return { ...account };
		},

		async getPlans() {
			return fixtures.plans.map((plan) => ({ ...plan, features: [...plan.features] }));
		},

		async getRecentJobs(limit = 5) {
			return fixtures.recentJobs.slice(0, limit).map((job) => ({ ...job }));
		},

		async getUsage() {
			return structuredClone(fixtures.usage);
		},

		async getApiKeys() {
			return keys.map((key) => ({ ...key }));
		},

		async getBilling() {
			return {
				...billing,
				invoices: billing.invoices.map((invoice) => ({ ...invoice }))
			};
		},

		async getNotificationPreferences() {
			return { ...preferences };
		},

		async getCheckoutResult(): Promise<CheckoutResult> {
			// TODO(EPSILON-46): read the checkout result from the service once the
			// Stripe return flow exists. Never claim Pro until the plan state confirms it.
			return { status: 'success', plan: account.plan, renewsAt: account.renewsAt };
		},

		async createApiKey(label: string): Promise<CreatedApiKey> {
			const secret = `ak_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 21)}`;
			const key: ApiKey = {
				id: `key_${crypto.randomUUID().slice(0, 8)}`,
				label: label.trim() || 'untitled',
				prefix: `ak_live_…${secret.slice(-3)}`,
				createdAt: now().toISOString(),
				lastUsedAt: null,
				revoked: false
			};
			keys = [key, ...keys];
			return { ...key, secret };
		},

		async revokeApiKey(id: string): Promise<ApiKey> {
			const key = keys.find((candidate) => candidate.id === id);
			if (!key) throw new MockApiError('not-found', 'That key no longer exists.');
			if (key.revoked) throw new MockApiError('already-revoked', 'That key is already revoked.');
			key.revoked = true;
			return { ...key };
		},

		async updateProfile(name: string) {
			account = { ...account, name: name.trim() || account.name };
			return { ...account };
		},

		async updateNotificationPreferences(next: NotificationPreferences) {
			preferences = { ...next };
			return { ...preferences };
		},

		async startCheckout(planId: PlanId): Promise<CheckoutResult> {
			if (planId === 'enterprise') {
				throw new MockApiError(
					'enterprise-contact',
					'Enterprise plans are arranged with sales, not checkout.'
				);
			}
			// A real adapter returns `processing` until the webhook confirms the plan;
			// the mock is synchronous so it can show the success state.
			account = { ...account, plan: planId };
			billing = { ...billing, plan: planId };
			return { status: 'success', plan: planId, renewsAt: account.renewsAt };
		}
	};
}
