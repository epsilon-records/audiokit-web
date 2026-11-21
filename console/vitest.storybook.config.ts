import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig, type TestProjectConfiguration } from 'vitest/config';
import viteConfig from './vite.config';

// Every story renders in Chromium and must pass axe (EPSILON-169), once per theme.
// Run with `npm run test:storybook`. The unit tests keep their own config (vitest.config.ts).
function project(theme: 'dark' | 'light'): TestProjectConfiguration {
	return {
		extends: true,
		plugins: [storybookTest({ configDir: '.storybook' })],
		// Pre-bundled up front: discovered mid-run, Vite re-optimises and reloads the page, which
		// fails every story in flight on a cold cache (CI).
		optimizeDeps: { include: ['bits-ui', 'tailwind-variants', 'clsx', 'tailwind-merge'] },
		define: { 'import.meta.env.VITE_STORYBOOK_THEME': JSON.stringify(theme) },
		test: {
			name: `storybook-${theme}`,
			browser: {
				enabled: true,
				headless: true,
				// CI installs Playwright's Chromium; PLAYWRIGHT_CHROMIUM_PATH points at a local Chrome instead.
				provider: playwright({
					launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
						? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
						: {}
				}),
				instances: [{ browser: 'chromium' }]
			},
			setupFiles: ['.storybook/vitest.setup.ts']
		}
	};
}

export default mergeConfig(
	viteConfig,
	defineConfig({ test: { projects: [project('dark'), project('light')] } })
);
