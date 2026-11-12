/** Session cookie helpers shared by the server hooks, routes and components. */

export const SESSION_COOKIE = 'ak_console_session';

/**
 * Sessions are short-lived by design. The billing service signs session tokens for the same 8
 * hours and refuses older ones (EPSILON-114), so the cookie never outlives its token.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const DEFAULT_AFTER_LOGIN = '/dashboard';

/** A placeholder origin for resolving `next`; any value works, it is only compared with itself. */
const RESOLVE_BASE = 'https://console.invalid';

/**
 * Only allow same-origin, absolute paths as post-login destinations. This keeps
 * the magic-link `next` parameter from becoming an open redirect.
 *
 * The value is checked twice: as text (an absolute path, with no backslash and no control
 * character, since URL parsers drop or rewrite those) and as a URL (resolved against a base,
 * it must stay on that base's origin).
 */
export function safeNext(next: string | null | undefined): string {
	if (!next) return DEFAULT_AFTER_LOGIN;
	if (!next.startsWith('/') || next.startsWith('//')) return DEFAULT_AFTER_LOGIN;
	if (/[\\\u0000-\u001f\u007f]/.test(next)) return DEFAULT_AFTER_LOGIN;
	try {
		if (new URL(next, RESOLVE_BASE).origin !== RESOLVE_BASE) return DEFAULT_AFTER_LOGIN;
	} catch {
		return DEFAULT_AFTER_LOGIN;
	}
	return next;
}
