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
			adapter: adapter({ publish: 'build' })
		})
	]
});
