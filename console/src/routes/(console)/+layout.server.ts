import { redirect } from '@sveltejs/kit';
import { apiFor } from '#lib/api-client';
import { apiVersion } from '#lib/fixtures';
import type { LayoutServerLoad } from './$types';

/**
 * The signed-in shell. Every route in this group requires a session; the deep
 * link is carried through sign-in so the user lands back where they started.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		const next = url.pathname + url.search;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}

	const client = apiFor(locals.sessionToken);
	const [account, usage] = await Promise.all([client.getAccount(), client.getUsage()]);
	return { account, usage, apiVersion, session: locals.session };
};
