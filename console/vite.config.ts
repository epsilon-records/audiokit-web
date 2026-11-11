import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig({
	// Expose PUBLIC_* variables (e.g. PUBLIC_BILLING_API_URL) to the app via
	// `import.meta.env`, alongside Vite's default VITE_ prefix.
	envPrefix: ['PUBLIC_', 'VITE_'],
	define: {
		__METRICS_PRODUCTION__: JSON.stringify(
			loadEnv('production', '.', 'CONTEXT').CONTEXT === 'production'
		)
	},
	plugins: [
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

			// Content-Security-Policy (EPSILON-118). SvelteKit adds a per-request nonce to its
			// own scripts. The browser only talks to this origin (billing is called from the
			// server) and Google Fonts. Stripe's checkout and portal are top-level navigations,
			// which CSP does not restrict.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Inline style attributes are used for layout; with 'unsafe-inline' present
					// SvelteKit skips style nonces so the browser honours it.
					'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
					'font-src': ['self', 'https://fonts.gstatic.com'],
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
