import { api } from '#lib/api-client';
import { apiBaseUrl } from '#lib/fixtures';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [account, usage, jobs, keys] = await Promise.all([
		api.getAccount(),
		api.getUsage(),
		api.getRecentJobs(5),
		api.getApiKeys()
	]);

	return {
		account,
		usage,
		jobs,
		activeKeys: keys.filter((key) => !key.revoked).length,
		apiBaseUrl
	};
};
