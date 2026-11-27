import llms from '#lib/site/llms.txt?raw';
import { docsMarkdown, renderDocsMarkdown } from '#lib/server/site/markdown';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
	const documents = await Promise.all(
		(Object.keys(docsMarkdown) as (keyof typeof docsMarkdown)[]).map(renderDocsMarkdown)
	);
	return new Response([llms, ...documents].join('\n---\n\n'), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
