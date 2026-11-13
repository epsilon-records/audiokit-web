/**
 * The typed client for the billing/accounts service.
 *
 * This module is the only boundary between screens and the service. It picks an
 * adapter:
 *
 * - `http` when `PUBLIC_BILLING_API_URL` is set (production and any deployed
 *   environment). The real client lives in `http-adapter.ts`.
 * - `mock` otherwise, so local dev, tests and the build work with no service.
 *
 * Auth is email magic link through the billing service (knowledge decision
 * 0016). The mock shows the link on the sign-in screen; the HTTP adapter posts
 * to the service and the session JWT is stored in the `ak_console_session`
 * cookie. Screens import `apiFor(sessionToken)` for signed-in calls and `api`
 * for the unauthenticated auth flow.
 */

import { ApiError } from './errors';
import { createHttpAdapter } from './http-adapter';
import { createMockAdapter } from './mock-adapter';
import type {
	Account,
	ApiKey,
	BillingSummary,
	CreatedApiKey,
	Credits,
	Job,
	MagicLinkExchange,
	MagicLinkRequest,
	NotificationPreferences,
	Plan,
	Session,
	UsageSummary
} from './types';
import type { SignupSource } from './signup-source';

export type ConsoleApi = {
	/** Ask the billing service to email a sign-in link. */
	requestMagicLink(
		email: string,
		options?: { next?: string; signup?: boolean; source?: SignupSource }
	): Promise<MagicLinkRequest>;
	/** Consume the token from that link. */
	exchangeMagicLink(token: string): Promise<MagicLinkExchange>;
	/** Resolve the session cookie without a round trip, for the server hooks. */
	parseSessionToken(token: string | null | undefined): Session | null;

	getAccount(): Promise<Account>;
	getPlans(): Promise<Plan[]>;
	getRecentJobs(limit?: number): Promise<Job[]>;
	getUsage(): Promise<UsageSummary>;
	/**
	 * The prepaid credit balance (billing #59, `GET /v1/credits`). `signal` cancels the request;
	 * the mock has nothing in flight and ignores it.
	 */
	getCredits(signal?: AbortSignal): Promise<Credits>;
	getApiKeys(): Promise<ApiKey[]>;
	getBilling(): Promise<BillingSummary>;
	getNotificationPreferences(): Promise<NotificationPreferences>;
	createBillingPortal(): Promise<string>;

	createApiKey(label: string): Promise<CreatedApiKey>;
	revokeApiKey(id: string): Promise<ApiKey>;
	updateProfile(name: string, company?: string): Promise<Account>;
	/**
	 * Delete the signed-in account (decision 0042): billing records, API keys, the Stripe
	 * customer and the API's jobs. `confirmEmail` must be the account's address. Safe to repeat
	 * while it is incomplete; once the account is gone its sessions are too, so a repeat with the
	 * same token is `unauthorized`. Rejects with a retryable
	 * `server-error` when the service could only finish part of it; the same call resumes.
	 */
	deleteAccount(confirmEmail: string): Promise<void>;
	/**
	 * Sign out at the service (EPSILON-114): ends every session of this account, on every
	 * device, not only this cookie's. Resolves when the session is already gone.
	 */
	signOut(): Promise<void>;
	updateNotificationPreferences(next: NotificationPreferences): Promise<NotificationPreferences>;
};

export type ApiAdapter = 'mock' | 'http';

export type ApiClientOptions = {
	/** Force an adapter; defaults to `http` when a base URL is set, else `mock`. */
	adapter?: ApiAdapter;
	/** The billing service root. Defaults to `PUBLIC_BILLING_API_URL`. */
	baseUrl?: string;
	/** The service session token, for the HTTP adapter. */
	sessionToken?: string | null;
	/** Injectable fetch, used by tests. */
	fetch?: typeof fetch;
	/** Injectable clock, used by tests. */
	now?: () => Date;
};

/**
 * The billing service root from the environment, if configured.
 *
 * `import.meta.env.PUBLIC_BILLING_API_URL` is replaced at build time (Vite
 * `envPrefix` includes `PUBLIC_`); `process.env` is the runtime fallback for the
 * Netlify function and for tests.
 */
export function billingApiUrl(): string | undefined {
	const fromVite = import.meta.env?.PUBLIC_BILLING_API_URL;
	if (typeof fromVite === 'string' && fromVite.length > 0) return fromVite;
	const fromProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
		.process?.env?.PUBLIC_BILLING_API_URL;
	if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess;
	return undefined;
}

export function createApiClient(options: ApiClientOptions = {}): ConsoleApi {
	const baseUrl = options.baseUrl ?? billingApiUrl();
	const adapter = options.adapter ?? (baseUrl ? 'http' : 'mock');

	switch (adapter) {
		case 'mock':
			return createMockAdapter({ now: options.now });
		case 'http':
			if (!baseUrl) {
				throw new Error(
					'The http adapter needs a billing service URL (PUBLIC_BILLING_API_URL or baseUrl).'
				);
			}
			return createHttpAdapter({
				baseUrl,
				sessionToken: options.sessionToken,
				fetch: options.fetch,
				now: options.now
			});
		default:
			throw new Error(`Unknown API adapter: ${String(adapter)}`);
	}
}

/**
 * A client for one signed-in request. In HTTP mode this is a fresh, stateless
 * adapter carrying the session token; in mock mode it is the shared singleton
 * so in-memory mutations survive navigation.
 */
export function apiFor(sessionToken?: string | null): ConsoleApi {
	const baseUrl = billingApiUrl();
	if (!baseUrl) return api;
	return createHttpAdapter({ baseUrl, sessionToken });
}

/** The app's client. Mock when no billing URL is configured. */
export const api: ConsoleApi = createApiClient();

export { ApiError } from './errors';
export { HttpApiError } from './http-adapter';
export { MockApiError } from './mock-adapter';
