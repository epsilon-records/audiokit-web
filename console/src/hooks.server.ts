import type { Handle } from '@sveltejs/kit/hooks';
import { api } from '#lib/api-client';
import { SESSION_COOKIE } from '#lib/session';

/**
 * Resolves the session cookie on every request and adds a small set of security
 * headers. Mock-first: `parseSessionToken` reads the mock token format; when the
 * billing service is hosted this becomes a session/verification call and the
 * cookie stays opaque to the app.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = api.parseSessionToken(event.cookies.get(SESSION_COOKIE));

	const response = await resolve(event);

	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
