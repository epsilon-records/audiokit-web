// The public pages are prerendered to plain HTML that works with JavaScript off, and keep the
// static site's URLs, trailing slash included (EPSILON-169 PR 2). The signed-in app in (app) and
// the auth routes keep SvelteKit's default form (/login, /dashboard).
export const prerender = true;
export const trailingSlash = 'always';
