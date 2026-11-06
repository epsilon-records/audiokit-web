import { apiFor } from '#lib/api-client';
import { apiBaseUrl } from '#lib/fixtures';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const client = apiFor(locals.sessionToken);
	const [account, usage, jobs, keys] = await Promise.all([
		client.getAccount(),
		client.getUsage(),
		client.getRecentJobs(5),
		client.getApiKeys()
	]);

	return {
		account,
		usage,
		jobs,
		activeKeys: keys.filter((key) => !key.revoked).length,
		apiBaseUrl
	};
};
