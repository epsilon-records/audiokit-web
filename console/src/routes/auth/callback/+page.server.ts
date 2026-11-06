import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { api } from '#lib/api-client';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, safeNext } from '#lib/session';
import type { PageServerLoad } from './$types';

/**
 * Magic-link landing point. The billing service will redirect here with a token;
 * in mock mode the link is shown on the sign-in screen instead of emailed.
 */
export const load: PageServerLoad = async ({ url, cookies, locals }) => {
	const next = safeNext(url.searchParams.get('next'));
	const token = url.searchParams.get('token');

	if (!token) {
		if (locals.session) redirect(303, next);
		return { ok: false, error: 'That link is missing its token. Request a new one.' };
	}

	const result = await api.exchangeMagicLink(token);
	if (!result.ok) {
		return { ok: false, error: 'That link is invalid or has expired. Request a new one.' };
	}

	cookies.set(SESSION_COOKIE, result.token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_MAX_AGE_SECONDS
	});

	redirect(303, next);
};
