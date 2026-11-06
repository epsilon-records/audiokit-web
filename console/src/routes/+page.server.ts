import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** `/` is not a screen: send signed-in visitors to the dashboard, others to sign in. */
export const load: PageServerLoad = async ({ locals }) => {
	redirect(303, locals.session ? '/dashboard' : '/login');
};
