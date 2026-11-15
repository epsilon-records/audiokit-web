import { loadContract } from '#lib/server/site/contract';
import type { RequestHandler } from './$types';

export const prerender = true;

// The contract the pages were generated from, as the static site published it.
export const GET: RequestHandler = async () =>
	new Response((await loadContract()).text, {
		headers: { 'content-type': 'application/yaml; charset=utf-8' }
	});
