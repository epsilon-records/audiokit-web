import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import YAML from 'yaml';

// The API version the public footer states (EPSILON-169 PR 2), from the repo's contract. The
// prerendered pages read the contract at build time; this is for the server-rendered 404 page.
const contractVersion = String(
	YAML.parse(readFileSync(new URL('../contract/openapi.yaml', import.meta.url), 'utf8'))?.info
		?.version ?? '?'
);

export default defineConfig({
	// Expose PUBLIC_* variables (e.g. PUBLIC_BILLING_API_URL) to the app via
	// `import.meta.env`, alongside Vite's default VITE_ prefix.
	envPrefix: ['PUBLIC_', 'VITE_'],
	define: {
		__API_VERSION__: JSON.stringify(contractVersion),
		__METRICS_PRODUCTION__: JSON.stringify(
			loadEnv('production', '.', 'CONTEXT').CONTEXT === 'production'
		)
	},
	plugins: [
		// Tailwind v4 for the shared components (shared 0046); src/tailwind.css is its entry.
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the app (Svelte 5), except for node_modules.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// The console is its own Netlify site (separate from the static site build in ../).
			// The adapter writes the client and prerendered assets to build/ and the SSR
			// function to .netlify/functions-internal/. See netlify.toml.
			adapter: adapter({ publish: 'build' }),

			// The public pages are prerendered (EPSILON-169 PR 2). Nothing links to the not-found
			// page, so it is listed here; the crawler finds the rest from '*' and the links.
			prerender: { entries: ['*', '/404.html'] },

			// Content-Security-Policy (EPSILON-118). SvelteKit adds a per-request nonce to its
			// own scripts. The browser only talks to this origin: billing is called from the
			// server, and the fonts are self-hosted (shared 0039, audit F-08). Stripe's checkout
			// and portal are top-level navigations, which CSP does not restrict.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Inline style attributes are used for layout; with 'unsafe-inline' present
					// SvelteKit skips style nonces so the browser honours it.
					'style-src': ['self', 'unsafe-inline'],
					'font-src': ['self'],
					'img-src': ['self', 'data:'],
					'connect-src': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'object-src': ['none']
				}
			}
		})
	]
});
