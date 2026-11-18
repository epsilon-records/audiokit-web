import { defineConfig } from 'vitest/config';

// Checks on the built site in build/ (EPSILON-169 PR 2): every old URL is produced, the
// prerendered pages fit their Content-Security-Policy, and the public scripts are where they
// belong. Run after `npm run build`, or with `npm run test:build`, which builds first.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests-build/**/*.test.ts']
	}
});
