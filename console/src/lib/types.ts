/**
 * Types for the console's view of the billing/accounts service.
 *
 * These mirror the information each screen needs
 * (docs/console/information-architecture.md §7), not the service's wire format.
 * Auth is email magic link through the billing service (knowledge decision 0016);
 * the service's HTTP API is not settled yet, so `api-client.ts` is the only place
 * that should know how these are fetched.
 */

export type PlanId = 'free' | 'pro' | 'enterprise';

export type Plan = {
	id: PlanId;
	name: string;
	priceMonthly: number | null;
	priceLabel: string;
	jobLimit: number | null;
	features: string[];
	/** One line describing what this plan adds over the current one. */
	delta?: string;
	featured?: boolean;
};

export type Account = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	plan: PlanId;
	/** ISO date the current period resets. */
	renewsAt: string;
	/** Set when a payment has failed; drives the past-due banner and badge. */
	pastDue?: boolean;
	/** Set when a downgrade is scheduled for the end of the period. */
	cancelsAt?: string;
};

export type JobStatus = 'succeeded' | 'running' | 'queued' | 'failed';

export type Job = {
	id: string;
	operation: string;
	status: JobStatus;
	/** ISO timestamp. */
	createdAt: string;
};

export type UsageSummary = {
	periodStart: string;
	periodEnd: string;
	jobsUsed: number;
	jobLimit: number;
	/**
	 * Stem separations this period. Stems are a sub-cap of the job allowance (decision 0023): a
	 * separation uses a slot in both, so this is a second meter over the same work, not extra
	 * usage. null means there is nothing to meter — the plan sets no stem sub-cap, or it is
	 * unlimited. The service has sent these fields all along; the console was dropping them, so
	 * a Pro customer saw a 1,000-job bar and no 250-stem bar.
	 */
	stemsUsed: number;
	stemLimit: number | null;
	/** Stems over the sub-cap, billed at the stem rate only (decision 0027). */
	stemsOverage: number;
	/** Jobs per day for the current period. */
	daily: { date: string; jobs: number }[];
	byOperation: { operation: string; jobs: number }[];
	history: {
		period: string;
		jobs: number;
		limit: number;
		status: 'within quota' | 'quota reached' | 'overage';
	}[];
};

/** Where a lot of credits came from (billing's `credit_lots.source`). */
export type CreditLotSource = 'free_monthly' | 'purchase' | 'grant';

/** An open lot: credits the account can still spend, from one source. */
export type CreditLot = {
	/** A source this console doesn't know reads as a grant. */
	source: CreditLotSource;
	credits: number;
	remaining: number;
	/** ISO timestamp. null: never expires (purchased credits, AudioKit 0074, epsilon-billing#79). */
	expiresAt: string | null;
	pack: string | null;
	createdAt: string;
};

/** One movement in the credit ledger, newest first. `credits` is signed: a debit is negative. */
export type CreditEntry = {
	kind: 'credit' | 'debit' | 'expiry' | 'release' | 'repay';
	credits: number;
	ref: string | null;
	createdAt: string;
};

/** A pack billing has a Stripe price for, so it is on sale (AudioKit 0066). */
export type CreditPackOnSale = {
	pack: string;
	credits: number;
	priceCents: number;
	currency: string;
};

/**
 * The low-balance state (EPSILON-233, AudioKit 0077), `credits.low_balance` in billing. Optional:
 * billing adds it in epsilon-billing#81, and the console shows the balance alone until then.
 */
export type LowBalance = {
	/** From the spendable balance: `ok` at or above the threshold, `low` below it, `empty` at 0. */
	state: 'ok' | 'low' | 'empty';
	threshold: number;
	/** ISO timestamp the balance went below the threshold; null while ok. */
	since: string | null;
	/** Whether this deployment sends the emails at all. Not shown: 0077 keeps sending off. */
	emailsEnabled: boolean;
	/** Whether this account's preference is on. */
	emailsOptedIn: boolean;
};

/**
 * The account's prepaid credits from billing's `GET /v1/credits` (decision 0052). The balance is
 * never negative (0072). Lots, entries and packs are always sent by billing; they are optional
 * here so a caller that only has the balance (the shell, stories) can say so.
 */
export type Credits = {
	balance: number;
	lots?: CreditLot[];
	entries?: CreditEntry[];
	packs?: CreditPackOnSale[];
	/** Absent until billing sends `credits.low_balance` (epsilon-billing#81). */
	lowBalance?: LowBalance;
};

export type ApiKey = {
	id: string;
	label: string;
	/** Only the prefix is ever shown after creation. */
	prefix: string;
	createdAt: string;
	lastUsedAt: string | null;
	revoked: boolean;
};

/**
 * The one-time response after creating a key: the full secret is never listed again, and nor is
 * the webhook secret that signs this key's result webhooks (`X-Signature`). `webhookSecret` is
 * null only when the billing service predates EPSILON-124 and did not return one.
 */
export type CreatedApiKey = ApiKey & { secret: string; webhookSecret: string | null };

export type Invoice = {
	id: string;
	date: string;
	amount: string;
	status: 'paid' | 'open' | 'past due';
	url: string;
};

export type NotificationPreferences = {
	quotaWarnings: boolean;
	paymentReceipts: boolean;
	productUpdates: boolean;
	/**
	 * Low-balance alert emails (EPSILON-233, `low_balance_alerts`). undefined while billing doesn't
	 * send the field (before epsilon-billing#81): the switch is hidden and a save never sends it.
	 */
	lowBalanceAlerts?: boolean;
};

export type BillingSummary = {
	plan: PlanId;
	renewsAt: string;
	paymentMethod: string | null;
	invoices: Invoice[];
	portalUrl: string | null;
};

/** A signed-in console session. The token is an opaque string owned by the service. */
export type Session = {
	email: string;
	/** ISO timestamp the session was issued. */
	issuedAt: string;
};

export type MagicLinkRequest = {
	sent: true;
	email: string;
	/** ISO timestamp the link stops working. */
	expiresAt: string;
	/**
	 * Mock-only: the link the service would have emailed. Present on the mock
	 * adapter so the flow can be walked without an inbox; never in production.
	 */
	devLink?: string;
};

export type MagicLinkExchange =
	| {
			ok: true;
			session: Session;
			token: string;
			created?: boolean;
			apiKey?: string | null;
			/** The default key's webhook secret, revealed with it, only when the account was created. */
			webhookSecret?: string | null;
	  }
	| { ok: false; error: 'invalid-token' | 'expired' };

export type ProfileUpdate = {
	name: string;
};
