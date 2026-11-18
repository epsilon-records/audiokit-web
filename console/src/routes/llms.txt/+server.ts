import llms from '#lib/site/llms.txt?raw';
import type { RequestHandler } from './$types';

export const prerender = true;

// The static site's llms.txt, as it is. Its Console line names console.audiokit.ai until the
// cut-over (plan, "Links, SEO").
export const GET: RequestHandler = () =>
	new Response(llms, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
