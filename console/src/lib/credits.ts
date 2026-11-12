/**
 * Prepaid credits (AudioKit decision 0052): 1 credit = $0.01. Free is 100 credits each calendar
 * month (UTC); unspent Free credits lapse at the month's end. Packs are not on sale at launch
 * (decision 0066), so this is the only credit number the console states.
 */
export const FREE_CREDITS_PER_MONTH = 100;

/** How long the console shell waits for the credit balance before it renders without the banner. */
export const CREDITS_DEADLINE_MS = 2_000;
