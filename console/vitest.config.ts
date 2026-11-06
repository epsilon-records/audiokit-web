import { defineConfig } from 'vitest/config';

// Unit tests cover the pure modules (the typed client's mock adapter, fixtures and
// formatters). Components and routes are exercised by `npm run check` and the build.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts']
	}
});
