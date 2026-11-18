import { renderSitePage } from '#lib/server/site/render';
import type { PageServerLoad } from './$types';

// Written as build/404.html, the page Netlify serves for a path no file or route answers.
export const trailingSlash = 'never';

export const load: PageServerLoad = async () => ({ page: await renderSitePage('/404.html') });
