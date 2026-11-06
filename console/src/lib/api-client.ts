/**
 * The typed client for the billing/accounts service.
 *
 * Auth is email magic link through the billing service (knowledge decision 0016),
 * and the service is not hosted yet (decision 0015), so the console is built
 * mock-first: screens import `api` (or a client passed to them) and never call
 * `fetch` directly. Swapping the mock adapter for an HTTP one is the only change
 * needed when the service's API is settled.
 *
 * No live network calls are made from this module today.
 */

import { createMockAdapter } from './mock-adapter';
import type {
	Account,
	ApiKey,
	BillingSummary,
	CheckoutResult,
	CreatedApiKey,
	Job,
	MagicLinkExchange,
	MagicLinkRequest,
	NotificationPreferences,
	Plan,
	PlanId,
	Session,
	UsageSummary
} from './types';

export type ConsoleApi = {
	/** Ask the billing service to email a sign-in link. */
	requestMagicLink(email: string, options?: { next?: string }): Promise<MagicLinkRequest>;
	/** Consume the token from that link. */
	exchangeMagicLink(token: string): Promise<MagicLinkExchange>;
	/** Resolve the session cookie without a round trip, for the server hooks. */
	parseSessionToken(token: string | null | undefined): Session | null;

	getAccount(): Promise<Account>;
	getPlans(): Promise<Plan[]>;
	getRecentJobs(limit?: number): Promise<Job[]>;
	getUsage(): Promise<UsageSummary>;
	getApiKeys(): Promise<ApiKey[]>;
	getBilling(): Promise<BillingSummary>;
	getNotificationPreferences(): Promise<NotificationPreferences>;
	getCheckoutResult(): Promise<CheckoutResult>;

	createApiKey(label: string): Promise<CreatedApiKey>;
	revokeApiKey(id: string): Promise<ApiKey>;
	updateProfile(name: string): Promise<Account>;
	updateNotificationPreferences(next: NotificationPreferences): Promise<NotificationPreferences>;
	startCheckout(planId: PlanId): Promise<CheckoutResult>;
};

export type ApiAdapter = 'mock';

export type ApiClientOptions = {
	/** Only `mock` exists until the billing service is hosted. */
	adapter?: ApiAdapter;
	/** Injectable clock, used by tests. */
	now?: () => Date;
};

export function createApiClient(options: ApiClientOptions = {}): ConsoleApi {
	const adapter = options.adapter ?? 'mock';
	switch (adapter) {
		case 'mock':
			return createMockAdapter({ now: options.now });
		default:
			throw new Error(`Unknown API adapter: ${String(adapter)}`);
	}
}

/** The app's client. Mock-first; see the module comment. */
export const api: ConsoleApi = createApiClient();

export { MockApiError } from './mock-adapter';
