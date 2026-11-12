import { redirect } from '@sveltejs/kit';
import { apiFor, HttpApiError } from '#lib/api-client';
import { CREDITS_DEADLINE_MS } from '#lib/credits';
import { apiVersion } from '#lib/fixtures';
import { SESSION_COOKIE } from '#lib/session';
import type { Credits } from '#lib/types';
import type { LayoutServerLoad } from './$types';

/**
 * The balance, or null when billing rejects or does not answer within the deadline. The timer is
 * cleared once the race settles so it does not outlive the request.
 */
async function creditsOrNull(read: Promise<Credits>): Promise<Credits | null> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<null>((resolve) => {
		timer = setTimeout(() => resolve(null), CREDITS_DEADLINE_MS);
	});
	try {
		return await Promise.race([read.catch(() => null), deadline]);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * The signed-in shell. Every route in this group requires a session; the deep
 * link is carried through sign-in so the user lands back where they started.
 */
export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	const next = url.pathname + url.search;
	if (!locals.session) {
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}

	const client = apiFor(locals.sessionToken);
	// The cookie is decoded without its signature, so the billing service is the
	// authority: an invalid or expired token means "not signed in", not a crash
	// (EPSILON-80).
	const data = await Promise.all([
		client.getAccount(),
		client.getUsage(),
		// The banner is the only reader, so a billing service that errors or stalls leaves it hidden
		// rather than taking the console down. A bad session fails getAccount() above all the same.
		creditsOrNull(client.getCredits())
	]).catch((error) => {
		if (error instanceof HttpApiError && error.code === 'unauthorized') {
			cookies.delete(SESSION_COOKIE, { path: '/' });
			redirect(303, `/login?next=${encodeURIComponent(next)}`);
		}
		throw error;
	});
	const [account, usage, credits] = data;
	return { account, usage, credits, apiVersion, session: locals.session };
};
