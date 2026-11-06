import { api } from '#lib/api-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [account, billing, plans] = await Promise.all([
		api.getAccount(),
		api.getBilling(),
		api.getPlans()
	]);
	const plan = plans.find((candidate) => candidate.id === billing.plan) ?? null;
	return { account, billing, plan };
};
