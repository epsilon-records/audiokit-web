import { apiFor } from '#lib/api-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const client = apiFor(locals.sessionToken);
	const [account, billing, plans] = await Promise.all([
		client.getAccount(),
		client.getBilling(),
		client.getPlans()
	]);
	const plan = plans.find((candidate) => candidate.id === billing.plan) ?? null;
	return { account, billing, plan };
};
