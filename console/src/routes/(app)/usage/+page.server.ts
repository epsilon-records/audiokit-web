import { apiFor } from '#lib/api-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const usage = await apiFor(locals.sessionToken).getUsage();
	return { usage };
};
