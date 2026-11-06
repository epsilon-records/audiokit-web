import { api } from '#lib/api-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const usage = await api.getUsage();
	return { usage };
};
