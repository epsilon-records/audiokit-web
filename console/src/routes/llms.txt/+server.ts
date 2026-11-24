import llms from '#lib/site/llms.txt?raw';
import type { RequestHandler } from './$types';

export const prerender = true;

// Its Console line points at https://audiokit.ai/login since the cut-over (plan, "Links, SEO").
export const GET: RequestHandler = () =>
	new Response(llms, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
