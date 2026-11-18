import { renderSitePage } from '#lib/server/site/render';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	page: await renderSitePage('/docs/reference/')
});
