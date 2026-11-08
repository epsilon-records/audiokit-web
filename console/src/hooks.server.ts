import type { Handle } from '@sveltejs/kit/hooks';
import { api } from '#lib/api-client';
import { SESSION_COOKIE } from '#lib/session';

/**
 * Resolves the session cookie on every request and adds a small set of security
 * headers. The token is kept on `locals.sessionToken` for the HTTP adapter; the
 * decoded `locals.session` is what pages render. The mock adapter reads its own
 * token format; the HTTP adapter decodes the service's JWT without verifying it
 * (the service verifies every authenticated call).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.sessionToken = token;
	event.locals.session = api.parseSessionToken(token);

	const response = await resolve(event);

	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set(
		'referrer-policy',
		event.url.pathname.startsWith('/auth/') ? 'no-referrer' : 'strict-origin-when-cross-origin'
	);
	if (
		event.locals.session ||
		event.url.pathname.startsWith('/auth/') ||
		event.url.pathname === '/onboarding'
	)
		response.headers.set('cache-control', 'no-store');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
