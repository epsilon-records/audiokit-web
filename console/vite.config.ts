import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
