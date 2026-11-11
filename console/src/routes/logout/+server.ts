import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiFor } from '#lib/api-client';
import { SESSION_COOKIE } from '#lib/session';

/**
 * Sign out: end the session at the billing service, which signs this account out on every device
 * (EPSILON-114), then drop the cookie and return to the sign-in screen. The cookie goes even when
 * the service cannot be reached, so the browser is signed out either way.
 */
export const POST: RequestHandler = async ({ cookies, locals }) => {
	try {
		await apiFor(locals.sessionToken).signOut();
	} catch (error) {
		console.warn('Sign-out could not end the session at the billing service', error);
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/login');
};
