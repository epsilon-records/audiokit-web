import type { CreditEntry, CreditLot, CreditLotSource, Credits, LowBalance } from './types';

/**
 * Prepaid credits (AudioKit decision 0052): 1 credit = $0.01. Free is 100 credits each calendar
 * month (UTC); unspent Free credits lapse at the month's end. Packs are not on sale at launch
 * (decision 0066).
 */
export const FREE_CREDITS_PER_MONTH = 100;

/** How long the console shell waits for the credit balance before it renders without the banner. */
export const CREDITS_DEADLINE_MS = 2_000;

/**
 * The first day of the next calendar month in UTC: when an exhausted Free account gets its
 * monthly credits again (decision 0052). Packs are not on sale (0066), so this is the only way
 * back to a positive balance.
 */
export function nextFreeCreditsRenewal(now: Date): Date {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

const renewalFmt = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

/** The out-of-credits sentence the dashboard and the shell banner share, e.g. "1 December 2026". */
export function outOfCreditsNotice(now: Date): string {
	return `New jobs are refused until your free credits renew on ${renewalFmt.format(nextFreeCreditsRenewal(now))} (UTC).`;
}

/**
 * The credit packs of decision 0052, the app's own list: the credits page always shows all three.
 * Billing's `credits.packs` says which are on sale (only packs with a Stripe price, 0066), and
 * none is until Nate sets a price. The names are billing's `CREDIT_PACKS` keys.
 */
export const CREDIT_PACKS = [
	{ pack: 'credits_1000', credits: 1_000, priceCents: 1_000 },
	{ pack: 'credits_5500', credits: 5_500, priceCents: 5_000 },
	{ pack: 'credits_24000', credits: 24_000, priceCents: 20_000 }
] as const;

const dateFmt = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

const shortDateFmt = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	timeZone: 'UTC'
});

/** "Free monthly", "Purchased", "Granted". */
export function lotSourceLabel(source: CreditLotSource): string {
	return source === 'free_monthly'
		? 'Free monthly'
		: source === 'purchase'
			? 'Purchased'
			: 'Granted';
}

/**
 * When a lot's credits stop counting. A purchased lot never expires (0074): billing sends null
 * once epsilon-billing#79 is deployed, and a date before then, which is shown as it is.
 */
export function lotExpiry(lot: Pick<CreditLot, 'source' | 'expiresAt'>): string {
	if (lot.expiresAt === null) return 'Never expires';
	const date = dateFmt.format(new Date(lot.expiresAt));
	return lot.source === 'free_monthly' ? `Lapses ${date} (UTC)` : `Expires ${date} (UTC)`;
}

/** A ledger movement's kind, in words. */
export function entryKindLabel(kind: CreditEntry['kind']): string {
	return {
		credit: 'Added',
		debit: 'Spent',
		release: 'Returned',
		expiry: 'Lapsed',
		repay: 'Repaid'
	}[kind];
}

/** A signed credit amount: "+100", "−2" (a real minus sign), "0". */
export function signedCredits(credits: number): string {
	const abs = Math.abs(credits).toLocaleString('en-GB');
	return credits > 0 ? `+${abs}` : credits < 0 ? `−${abs}` : '0';
}

/** "$10", "$50", "$200": whole dollars, as the pricing page states them. */
export function packPrice(priceCents: number): string {
	return `$${(priceCents / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

/** The low-balance badge's word (AudioKit 0077, EPSILON-257). */
export function lowBalanceLabel(state: LowBalance['state']): string {
	return state === 'ok' ? 'OK' : state === 'low' ? 'Low' : 'Empty';
}

/** The line beside the badge, e.g. "Below 20 credits since 15 Nov." */
export function lowBalanceDetail(low: LowBalance): string {
	const threshold = `${low.threshold.toLocaleString('en-GB')} credits`;
	const since = low.since ? ` since ${shortDateFmt.format(new Date(low.since))}` : '';
	if (low.state === 'ok') return `At or above ${threshold}.`;
	if (low.state === 'low') return `Below ${threshold}${since}.`;
	return `No credits left${since}.`;
}

/**
 * Which shell banner to show. With billing's low-balance state (epsilon-billing#81) the banner
 * follows it, `low` and `empty`; without it, only an empty balance warns, as before.
 */
export function balanceBanner(credits: Credits | null): 'low' | 'empty' | null {
	if (credits === null) return null;
	if (credits.lowBalance) {
		return credits.lowBalance.state === 'ok' ? null : credits.lowBalance.state;
	}
	return credits.balance <= 0 ? 'empty' : null;
}
