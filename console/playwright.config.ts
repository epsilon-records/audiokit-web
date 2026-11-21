import { defineConfig, devices } from '@playwright/test';

// CI's Playwright container brings its own Chromium; PLAYWRIGHT_CHROMIUM_PATH points at a local
// Chrome instead, as in vitest.storybook.config.ts.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
	? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
	: {};

export default defineConfig({
	testDir: './e2e',
	timeout: 30_000,
	expect: { timeout: 10_000 },
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			testIgnore: /site\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'], launchOptions }
		},
		// The public pages as they ship (EPSILON-169 PR 2): prerendered by `vite build` and served
		// from build/ by `vite preview`, so these tests read the same HTML Netlify serves.
		{
			name: 'site',
			testMatch: /site\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'], launchOptions, baseURL: 'http://127.0.0.1:4174' }
		}
	],
	webServer: [
		{
			command: 'npm run dev -- --host 127.0.0.1 --port 4173',
			url: 'http://127.0.0.1:4173/login',
			timeout: 120_000,
			reuseExistingServer: !process.env.CI,
			env: { PUBLIC_BILLING_API_URL: '' }
		},
		{
			command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4174 --strictPort',
			url: 'http://127.0.0.1:4174/',
			timeout: 300_000,
			reuseExistingServer: !process.env.CI,
			env: { PUBLIC_BILLING_API_URL: '' }
		}
	]
});
