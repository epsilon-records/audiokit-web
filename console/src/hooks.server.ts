import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { api } from '#lib/api-client';
import { decoratePublicPage } from '#lib/server/site/public-head';
import { SESSION_COOKIE } from '#lib/session';

/**
 * Resolves the session cookie on every request and adds a small set of security
 * headers. The token is kept on `locals.sessionToken` for the HTTP adapter; the
 * decoded `locals.session` is what pages render. The mock adapter reads its own
 * token format; the HTTP adapter decodes the service's JWT without verifying it
 * (the service verifies every authenticated call).
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Exact credential-free branch before session-cookie decoding. Never widen auth routes.
	if (event.url.pathname === '/api/app-metrics') {
		try {
			if (event.platform?.context?.site?.id === 'bf5e8d56-ab54-47ef-a7ca-89d152c94fe3') {
				const headers = new Headers(event.request.headers);
				for (const key of ['traceparent', 'tracestate', 'x-amzn-trace-id', 'x-nf-trace-span-id'])
					headers.delete(key);
				event = { ...event, request: new Request(event.request, { headers }) };
			}
			return await resolve(event);
		} catch {
			return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
		}
	}
	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.sessionToken = token;
	event.locals.session = api.parseSessionToken(token);

	// The public pages are prerendered (EPSILON-169 PR 2): their scripts and their wider
	// Content-Security-Policy go into the built HTML only, never into a server-rendered page.
	const publicPage = building && (event.route.id?.startsWith('/(site)') ?? false);
	const response = await resolve(
		event,
		publicPage
			? {
					transformPageChunk: ({ html }) =>
						html.includes('</head>') ? decoratePublicPage(html) : html
				}
			: undefined
	);

	// The Content-Security-Policy comes from SvelteKit (vite.config.ts).
	response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set(
		'referrer-policy',
		event.url.pathname.startsWith('/auth/') ? 'origin' : 'strict-origin-when-cross-origin'
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
