import { sitemapXml } from '#lib/server/site/files';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () =>
	new Response(await sitemapXml(), { headers: { 'content-type': 'application/xml' } });
