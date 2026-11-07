/**
 * The HTTP adapter: the console talking to the real billing service
 * (`epsilon-records/audiokit-billing`).
 *
 * It is selected by `api-client.ts` when `PUBLIC_BILLING_API_URL` is set (or a
 * caller passes `baseUrl`); otherwise the mock adapter stays the default. The
 * `ConsoleApi` shape is identical, so screens do not change.
 *
 * Routes are taken from the service's `src/routes/` (auth, jobs, usage,
 * api-keys, subscriptions). Where the service has no endpoint yet, this adapter
 * calls a documented, proposed one and the console needs it added; those are
 * marked `ASSUMED` below and tracked on the knowledge board. The wire format is
 * the service's snake_case; the adapter translates to the console's types.
 *
 *   Auth (decision 0016 is email magic link; the service has no route yet)
 *     POST /v1/auth/magic-link            { email, next? }   ASSUMED
 *     POST /v1/auth/magic-link/exchange   { token }          ASSUMED
 *     GET  /v1/auth/me                    Bearer session     (exists)
 *     PATCH /v1/auth/me                   { name }           ASSUMED
 *   Account
 *     GET  /v1/account/notifications      GET/PATCH          ASSUMED
 *   Jobs
 *     GET  /v1/jobs?limit=                Bearer session     (exists, API-key only today)
 *   Usage
 *     GET  /v1/usage/current              Bearer session     (exists)
 *     GET  /v1/usage/history?limit=       Bearer session     (exists)
 *   API keys
 *     GET/POST /v1/api-keys, DELETE /v1/api-keys/:id         (exist)
 *   Subscriptions
 *     GET  /v1/subscriptions/current      Bearer session     (exists)
 *     GET  /v1/subscriptions/plans        Bearer session     ASSUMED
 *     POST /v1/subscriptions/checkout     { tier }           ASSUMED (Stripe task)
 *
 * The session cookie holds the service's JWT. `parseSessionToken` decodes it
 * without verifying it so the server hooks can resolve `locals.session`; every
 * authenticated call sends it as a bearer token and the service verifies it, so
 * a forged cookie cannot read data.
 */

import { ApiError } from './errors';
import type { ConsoleApi } from './api-client';
import type {
	Account,
	ApiKey,
	BillingSummary,
	CheckoutResult,
	CreatedApiKey,
	Job,
	JobStatus,
	MagicLinkExchange,
	MagicLinkRequest,
	NotificationPreferences,
	Plan,
	PlanId,
	Session,
	UsageSummary
} from './types';

export type HttpApiErrorCode =
	| 'invalid-email'
	| 'invalid-request'
	| 'unauthorized'
	| 'forbidden'
	| 'not-found'
	| 'conflict'
	| 'rate-limited'
	| 'not-supported'
	| 'server-error'
	| 'network';

/** A failure from the billing service (or the network in front of it). */
export class HttpApiError extends ApiError {
	constructor(
		code: HttpApiErrorCode,
		message: string,
		readonly status?: number
	) {
		super(code, message);
		this.name = 'HttpApiError';
	}
}

/* -------------------------------------------------------------------------- */
/* Wire types (the service's JSON shapes, snake_case)                          */
/* -------------------------------------------------------------------------- */

type WireUser = {
	id: string;
	email: string;
	name: string | null;
	email_verified_at: string | null;
};

type WireSubscription = {
	id: string;
	tier: PlanId;
	status: string;
	current_period_start: string;
	current_period_end: string;
	cancel_at_period_end?: boolean;
	stripe_status?: string;
};

type WirePlan = {
	tier: PlanId;
	name: string;
	price_monthly_cents: number;
	monthly_job_quota: number;
	overage_price_cents: number | null;
	/** Stems allowed inside the job quota; null when the plan has no stem sub-cap (decision 0023). */
	monthly_stem_quota?: number | null;
	/** Cents per stem over the sub-cap; a stem over it is billed here only (decision 0027). */
	stem_overage_price_cents?: number | null;
	priority_processing: boolean;
	email_support: boolean;
	sla_uptime_percentage: number | string | null;
};

type WireUsageCurrent = {
	tier: PlanId;
	jobCount: number;
	jobCountByOperation: Record<string, number> | null;
	quotaLimit: number;
	overageCount: number;
	/** Stem sub-cap usage. Optional: an older service omits them, which reads as "no sub-cap". */
	stemCount?: number | null;
	stemQuotaLimit?: number | null;
	stemOverageCount?: number | null;
	periodStart: string;
	periodEnd: string;
	/** Jobs per calendar day in the period, from the service. */
	daily?: { date: string; count: number }[];
};

type WireUsageHistory = {
	period_start: string;
	job_count: number;
	quota_limit: number;
};

type WireApiKey = {
	id: string;
	name: string | null;
	key_prefix: string;
	is_active: boolean;
	last_used_at: string | null;
	created_at: string;
};

type WireCreatedApiKey = {
	id: string;
	name: string | null;
	api_key: string;
	key_prefix: string;
	created_at: string;
};

type WireJob = {
	provider_job_id: string;
	operation: string;
	status: string;
	queued_at: string;
};

type WireMagicLinkRequest = {
	email?: string;
	expires_at?: string;
	expiresAt?: string;
	dev_link?: string;
	devLink?: string;
};

type WireNotificationPreferences = {
	quota_warnings: boolean;
	payment_receipts: boolean;
	product_updates: boolean;
};

type WireCheckout = {
	status?: CheckoutResult['status'];
	tier?: PlanId;
	current_period_end?: string;
	url?: string;
};
type WirePortal = { url: string };

type WireError = { error?: string; message?: string };

/* -------------------------------------------------------------------------- */
/* Mapping helpers                                                             */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 10 * 60 * 1000;

const periodFmt = new Intl.DateTimeFormat('en-GB', {
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});

function formatPeriod(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : periodFmt.format(date);
}

function toAccount(user: WireUser, subscription: WireSubscription): Account {
	return {
		id: user.id,
		name: user.name ?? user.email,
		email: user.email,
		emailVerified: Boolean(user.email_verified_at),
		plan: subscription.tier,
		renewsAt: subscription.current_period_end,
		pastDue: (subscription.stripe_status ?? subscription.status) === 'past_due',
		cancelsAt: subscription.cancel_at_period_end ? subscription.current_period_end : undefined
	};
}

function toPlan(wire: WirePlan): Plan {
	const quota = wire.monthly_job_quota;
	const features: string[] = [
		quota === -1 ? 'Unlimited jobs' : `${quota.toLocaleString('en-GB')} jobs per month`
	];
	// Stems are a sub-cap of the job allowance (decision 0023). The service sends these columns from
	// subscription_plans; dropping them made a Pro card read "1,000 jobs per month · Overage at
	// $0.01 per job", which implies a stem separation costs a penny instead of $0.15.
	if (wire.monthly_stem_quota != null) {
		features.push(`${wire.monthly_stem_quota.toLocaleString('en-GB')} stem separations included`);
	}
	const jobOverageCents = wire.overage_price_cents;
	const stemOverageCents = wire.stem_overage_price_cents;
	if (jobOverageCents != null && stemOverageCents != null) {
		// Decision 0027: an excess stem is billed at the stem rate only, never at both rates.
		const jobRate = (jobOverageCents / 100).toFixed(2);
		const stemRate = (stemOverageCents / 100).toFixed(2);
		features.push(`Overage at $${stemRate} per stem and $${jobRate} per other job, never both on one stem`);
	} else if (jobOverageCents == null && stemOverageCents != null) {
		// A stem rate with no job rate is Enterprise: decision 0023 prices its volume overage per
		// agreement, and the pricing page says the same. Printing the seeded $0.08 here would
		// advertise a negotiable rate on a card whose price reads "Custom", so the number stays out.
		features.push('Volume overage per agreement');
	} else if (jobOverageCents != null) {
		features.push(`Overage at $${(jobOverageCents / 100).toFixed(2)} per job`);
	}
	if (wire.priority_processing) features.push('Priority processing');
	if (wire.email_support) features.push('Email support');
	if (wire.sla_uptime_percentage != null) {
		features.push(`${Number(wire.sla_uptime_percentage)}% uptime SLA`);
	}

	const priceMonthly = wire.tier === 'enterprise' ? null : wire.price_monthly_cents / 100;
	return {
		id: wire.tier,
		name: wire.name,
		priceMonthly,
		priceLabel: priceMonthly === null ? 'Custom' : `$${priceMonthly}`,
		jobLimit: quota === -1 ? null : quota,
		features,
		featured: wire.tier === 'pro'
	};
}

function toJobStatus(status: string): JobStatus {
	if (
		status === 'succeeded' ||
		status === 'running' ||
		status === 'queued' ||
		status === 'failed'
	) {
		return status;
	}
	// The service has `canceled`; the console shows a cancelled job as failed.
	return 'failed';
}

function toJob(wire: WireJob): Job {
	return {
		id: wire.provider_job_id,
		operation: wire.operation,
		status: toJobStatus(wire.status),
		createdAt: wire.queued_at
	};
}

function toApiKey(wire: WireApiKey): ApiKey {
	return {
		id: wire.id,
		label: wire.name ?? 'untitled',
		prefix: wire.key_prefix,
		createdAt: wire.created_at,
		lastUsedAt: wire.last_used_at ?? null,
		revoked: !wire.is_active
	};
}

function toNotificationPreferences(wire: WireNotificationPreferences): NotificationPreferences {
	return {
		quotaWarnings: Boolean(wire.quota_warnings),
		paymentReceipts: Boolean(wire.payment_receipts),
		productUpdates: Boolean(wire.product_updates)
	};
}

function toUsage(current: WireUsageCurrent, history: WireUsageHistory[]): UsageSummary {
	const limit = current.quotaLimit === -1 ? Number.POSITIVE_INFINITY : current.quotaLimit;
	const byOperation = Object.entries(current.jobCountByOperation ?? {})
		.map(([operation, jobs]) => ({ operation, jobs: Number(jobs) }))
		.sort((a, b) => b.jobs - a.jobs);

	return {
		periodStart: current.periodStart,
		periodEnd: current.periodEnd,
		jobsUsed: current.jobCount,
		jobLimit: limit,
		stemsUsed: current.stemCount ?? 0,
		// -1 is the service's unlimited marker (UNLIMITED_QUOTA); a bar to infinity is not drawable,
		// and a plan with no stem sub-cap reads the same way here: nothing to meter.
		stemLimit: current.stemQuotaLimit == null || current.stemQuotaLimit < 0 ? null : current.stemQuotaLimit,
		stemsOverage: current.stemOverageCount ?? 0,
		daily: (current.daily ?? []).map((day) => ({ date: day.date, jobs: Number(day.count) })),
		byOperation,
		history: history.map((record) => {
			const recordLimit = record.quota_limit === -1 ? Number.POSITIVE_INFINITY : record.quota_limit;
			const status: UsageSummary['history'][number]['status'] =
				recordLimit === Number.POSITIVE_INFINITY
					? 'within quota'
					: record.job_count > recordLimit
						? 'overage'
						: record.job_count === recordLimit
							? 'quota reached'
							: 'within quota';
			return {
				period: formatPeriod(record.period_start),
				jobs: record.job_count,
				limit: recordLimit,
				status
			};
		})
	};
}

function decodeBase64UrlJson(input: string): unknown {
	try {
		const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
		const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
		const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
		return JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		return null;
	}
}

/** Read `email`/`iat`/`exp` out of the service's session JWT, unverified. */
function decodeJwtSession(token: string | null | undefined, now: () => Date): Session | null {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const payload = decodeBase64UrlJson(parts[1]);
	if (!payload || typeof payload !== 'object') return null;

	const { email, iat, exp } = payload as { email?: unknown; iat?: unknown; exp?: unknown };
	if (typeof email !== 'string' || email.length === 0) return null;
	if (typeof exp === 'number' && exp * 1000 <= now().getTime()) return null;
	return {
		email,
		issuedAt: typeof iat === 'number' ? new Date(iat * 1000).toISOString() : now().toISOString()
	};
}

function statusToCode(status: number): HttpApiErrorCode {
	if (status === 400) return 'invalid-request';
	if (status === 401) return 'unauthorized';
	if (status === 403) return 'forbidden';
	if (status === 404) return 'not-found';
	if (status === 409) return 'conflict';
	if (status === 410) return 'not-found';
	if (status === 429) return 'rate-limited';
	if (status === 501) return 'not-supported';
	if (status >= 500) return 'server-error';
	return 'invalid-request';
}

function defaultMessage(status: number): string {
	if (status === 401) return 'Sign in again to continue.';
	if (status === 403) return 'You do not have access to that.';
	if (status === 404) return 'That was not found.';
	if (status === 429) return 'Too many requests. Try again in a moment.';
	if (status === 501) return 'The billing service does not support that yet.';
	if (status >= 500) return 'The billing service had a problem. Try again.';
	return 'The request was rejected.';
}

/* -------------------------------------------------------------------------- */
/* The adapter                                                                 */
/* -------------------------------------------------------------------------- */

export type HttpAdapterOptions = {
	/** The billing service root, e.g. `https://billing.audiokit.ai` (no `/v1`). */
	baseUrl: string;
	/** The service session token (the JWT in the console cookie). */
	sessionToken?: string | null;
	/** Injectable for tests. Defaults to the global `fetch`. */
	fetch?: typeof fetch;
	/** Injectable clock, used by tests. */
	now?: () => Date;
};

export function createHttpAdapter(options: HttpAdapterOptions): ConsoleApi {
	const baseUrl = options.baseUrl.replace(/\/+$/, '');
	const sessionToken = options.sessionToken ?? null;
	const fetchImpl = options.fetch ?? globalThis.fetch;
	const now = options.now ?? (() => new Date());

	if (typeof fetchImpl !== 'function') {
		throw new Error('No fetch implementation is available for the HTTP adapter.');
	}

	async function readJson(response: Response): Promise<unknown> {
		const text = await response.text();
		if (!text) return undefined;
		try {
			return JSON.parse(text);
		} catch {
			return undefined;
		}
	}

	async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
		const { auth = true, ...rest } = init;
		const headers = new Headers(rest.headers);
		headers.set('accept', 'application/json');
		if (rest.body !== undefined) headers.set('content-type', 'application/json');
		if (auth) {
			if (!sessionToken) throw new HttpApiError('unauthorized', 'Sign in again to continue.');
			headers.set('authorization', `Bearer ${sessionToken}`);
		}

		let response: Response;
		try {
			response = await fetchImpl(`${baseUrl}${path}`, { ...rest, headers });
		} catch {
			throw new HttpApiError(
				'network',
				'Could not reach the billing service. Check your connection and try again.'
			);
		}

		const payload = await readJson(response);
		if (!response.ok) {
			const wire = (payload ?? {}) as WireError;
			const message =
				typeof wire.message === 'string' && wire.message.length > 0
					? wire.message
					: defaultMessage(response.status);
			throw new HttpApiError(statusToCode(response.status), message, response.status);
		}
		return payload as T;
	}

/**
 * Decision 0031: a success body names each resource under a key (`{ usage }`, `{ portal }`).
 * The console ships first, so this reads the named shape *and* the pre-0031 shape it can still
 * meet while the service is mid-deploy or rolled back.
 *
 * The discriminator is the value's type, not the key's presence. `POST /v1/api-keys` used to
 * answer a bare object that already has an `api_key` member — the secret string — so unwrapping
 * on `key in payload` would hand back the secret as if it were the resource.
 */
function unwrap<T>(payload: unknown, key: string): T {
	if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
		const value = (payload as Record<string, unknown>)[key];
		if (value !== undefined && value !== null && typeof value === 'object') return value as T;
	}
	return payload as T;
}

	function json(body: unknown): RequestInit {
		return { body: JSON.stringify(body) };
	}

	async function getSubscription(): Promise<WireSubscription> {
		const payload = await request<{ subscription: WireSubscription }>('/v1/subscriptions/current');
		return payload.subscription;
	}

	async function getAccountInternal(): Promise<Account> {
		const [me, subscription] = await Promise.all([
			request<{ user: WireUser }>('/v1/auth/me'),
			getSubscription()
		]);
		return toAccount(me.user, subscription);
	}

	return {
		async requestMagicLink(email: string, requestOptions: { next?: string } = {}) {
			const normalised = email.trim().toLowerCase();
			if (!EMAIL_RE.test(normalised)) {
				throw new HttpApiError('invalid-email', 'Enter a valid email address.');
			}

			const payload = await request<WireMagicLinkRequest>('/v1/auth/magic-link', {
				method: 'POST',
				auth: false,
				...json({ email: normalised, next: requestOptions.next })
			});

			const result: MagicLinkRequest = {
				sent: true,
				email: payload.email ?? normalised,
				expiresAt:
					payload.expires_at ??
					payload.expiresAt ??
					new Date(now().getTime() + MAGIC_LINK_TTL_MS).toISOString(),
				devLink: payload.dev_link ?? payload.devLink
			};
			return result;
		},

		async exchangeMagicLink(token: string): Promise<MagicLinkExchange> {
			try {
				const payload = await request<{ user?: WireUser; token?: string }>(
					'/v1/auth/magic-link/exchange',
					{ method: 'POST', auth: false, ...json({ token }) }
				);
				if (!payload?.token || !payload.user) return { ok: false, error: 'invalid-token' };
				return {
					ok: true,
					token: payload.token,
					session: { email: payload.user.email, issuedAt: now().toISOString() }
				};
			} catch (error) {
				if (
					error instanceof HttpApiError &&
					(error.status === 400 || error.status === 401 || error.status === 410)
				) {
					return { ok: false, error: error.status === 410 ? 'expired' : 'invalid-token' };
				}
				throw error;
			}
		},

		parseSessionToken(token: string | null | undefined): Session | null {
			return decodeJwtSession(token, now);
		},

		getAccount: getAccountInternal,

		async getPlans() {
			const payload = await request<{ plans: WirePlan[] }>('/v1/subscriptions/plans');
			return payload.plans.map(toPlan);
		},

		async getRecentJobs(limit = 5) {
			const payload = await request<{ jobs: WireJob[] }>(
				`/v1/jobs?limit=${encodeURIComponent(String(limit))}`
			);
			return payload.jobs.map(toJob);
		},

		async getUsage() {
			const [currentPayload, history] = await Promise.all([
				request<unknown>('/v1/usage/current'),
				request<{ history: WireUsageHistory[] }>('/v1/usage/history?limit=12')
			]);
			// 0031: `{ usage }` with daily inside it; previously the usage object was spread
			// into the body with `daily` as a sibling.
			return toUsage(unwrap<WireUsageCurrent>(currentPayload, 'usage'), history.history ?? []);
		},

		async getApiKeys() {
			const payload = await request<{ api_keys: WireApiKey[] }>('/v1/api-keys');
			return payload.api_keys.map(toApiKey);
		},

		async getBilling(): Promise<BillingSummary> {
			const subscription = await getSubscription();
			return {
				plan: subscription.tier,
				renewsAt: subscription.current_period_end,
				// Invoices and the Stripe portal are the Stripe task; null until then.
				paymentMethod: null,
				invoices: [],
				portalUrl: null
			};
		},

		async getNotificationPreferences() {
			const payload = await request<unknown>('/v1/account/notifications');
			return toNotificationPreferences(unwrap<WireNotificationPreferences>(payload, 'notifications'));
		},

		async getCheckoutResult(outcome?: 'success' | 'canceled'): Promise<CheckoutResult> {
			if (outcome === 'canceled') return { status: 'cancelled' };
			if (outcome !== 'success') return { status: 'processing' };
			// Stripe's webhook updates the plan asynchronously. Poll briefly so the
			// return page reflects the confirmed subscription when it is ready.
			for (let attempt = 0; attempt < 5; attempt += 1) {
				const subscription = await getSubscription();
				if (subscription.tier === 'pro') {
					return { status: 'success', plan: subscription.tier, renewsAt: subscription.current_period_end };
				}
				if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			return { status: 'processing' };
		},

		async createBillingPortal(): Promise<string> {
			// 0031: `{ portal: { url } }` instead of a bare `{ url }`.
			const payload = await request<unknown>('/v1/subscriptions/portal', { method: 'POST' });
			const portal = unwrap<WirePortal>(payload, 'portal');
			if (!portal?.url) throw new HttpApiError('server-error', 'No billing portal URL returned.');
			return portal.url;
		},

		async createApiKey(label: string): Promise<CreatedApiKey> {
			const payload = await request<unknown>('/v1/api-keys', {
				method: 'POST',
				...json({ name: label.trim() || 'untitled' })
			});
			// 0031: `{ api_key: { id, name, api_key, ... } }`. Note the inner object still holds a
			// member called api_key (the secret), which is what unwrap's type check protects.
			const created = unwrap<WireCreatedApiKey>(payload, 'api_key');
			return {
				id: created.id,
				label: created.name ?? 'untitled',
				prefix: created.key_prefix,
				createdAt: created.created_at,
				lastUsedAt: null,
				revoked: false,
				secret: created.api_key
			};
		},

		async revokeApiKey(id: string): Promise<ApiKey> {
			// 0031 drops `{ success: true }` for 204, and readJson already turns an empty body
			// into undefined; the authoritative list is re-read below either way.
			await request<unknown>(`/v1/api-keys/${encodeURIComponent(id)}`, {
				method: 'DELETE'
			});
			const payload = await request<{ api_keys: WireApiKey[] }>('/v1/api-keys');
			const revoked = payload.api_keys.find((key) => key.id === id);
			if (!revoked) throw new HttpApiError('not-found', 'That key no longer exists.');
			return toApiKey(revoked);
		},

		async updateProfile(name: string): Promise<Account> {
			const trimmed = name.trim();
			if (trimmed.length === 0) {
				throw new HttpApiError('invalid-request', 'Enter a name.');
			}
			await request<{ user: WireUser }>('/v1/auth/me', {
				method: 'PATCH',
				...json({ name: trimmed })
			});
			return getAccountInternal();
		},

		async updateNotificationPreferences(next: NotificationPreferences) {
			const payload = await request<unknown>('/v1/account/notifications', {
				method: 'PATCH',
				...json({
					quota_warnings: next.quotaWarnings,
					payment_receipts: next.paymentReceipts,
					product_updates: next.productUpdates
				})
			});
			return toNotificationPreferences(unwrap<WireNotificationPreferences>(payload, 'notifications'));
		},

		async startCheckout(planId: PlanId, interval: 'month' | 'year' = 'month'): Promise<CheckoutResult> {
			if (planId === 'enterprise') {
				throw new HttpApiError(
					'invalid-request',
					'Enterprise plans are arranged with sales, not checkout.'
				);
			}
			const payload = await request<unknown>('/v1/subscriptions/checkout', {
				method: 'POST',
				...json({ tier: planId, interval })
			});
			// 0031: `{ checkout: { status, tier, url, session_id } }`.
			const checkout = unwrap<WireCheckout>(payload, 'checkout') ?? {};
			return {
				status: checkout.status ?? 'processing',
				plan: checkout.tier ?? planId,
				renewsAt: checkout.current_period_end,
				url: checkout.url
			};
		}
	};
}
