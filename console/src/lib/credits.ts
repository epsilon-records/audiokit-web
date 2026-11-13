/**
 * Prepaid credits (AudioKit decision 0052): 1 credit = $0.01. Free is 100 credits each calendar
 * month (UTC); unspent Free credits lapse at the month's end. Packs are not on sale at launch
 * (decision 0066), so this is the only credit number the console states.
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
