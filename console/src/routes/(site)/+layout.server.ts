import { loadContract } from '#lib/server/site/contract';
import type { LayoutServerLoad } from './$types';

/** The footer states the contract's version, as the static site's footer did. */
export const load: LayoutServerLoad = async () => {
	const { doc } = await loadContract();
	return { apiVersion: String(doc.info?.version ?? '?') };
};
