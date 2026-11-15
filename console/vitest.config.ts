import { defineConfig } from 'vitest/config';

// Unit tests cover the pure modules (the typed client's mock adapter, fixtures and
// formatters). Components and routes are exercised by `npm run check` and the build.
export default defineConfig({
	// hooks.server.ts reads `building` from $app/env (EPSILON-169 PR 2).
	resolve: {
		alias: { '$app/env': new URL('./tests/stubs/app-env.ts', import.meta.url).pathname }
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts']
	}
});
