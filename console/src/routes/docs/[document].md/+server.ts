import { error } from '@sveltejs/kit';
import { docsMarkdown, renderDocsMarkdown } from '#lib/server/site/markdown';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () =>
	Object.keys(docsMarkdown).map((document) => ({ document }));

export const GET: RequestHandler = async ({ params }) => {
	if (!Object.hasOwn(docsMarkdown, params.document)) error(404);
	return new Response(await renderDocsMarkdown(params.document as keyof typeof docsMarkdown), {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
};
