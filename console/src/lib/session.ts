/** Session cookie helpers shared by the server hooks, routes and components. */

export const SESSION_COOKIE = 'ak_console_session';

/**
 * Sessions are short-lived by design. The billing service signs session tokens for the same 8
 * hours and refuses older ones (EPSILON-114), so the cookie never outlives its token.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const DEFAULT_AFTER_LOGIN = '/dashboard';

/**
 * Only allow same-origin, absolute paths as post-login destinations. This keeps
 * the magic-link `next` parameter from becoming an open redirect.
 */
export function safeNext(next: string | null | undefined): string {
	if (!next) return DEFAULT_AFTER_LOGIN;
	if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
		return DEFAULT_AFTER_LOGIN;
	}
	return next;
}
