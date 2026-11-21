import type { StorybookConfig } from '@storybook/sveltekit';

// AudioKit's Storybook (knowledge decision 0064). It renders the console's shared components
// with mocked data only: the mock adapter and fixtures, never the billing service or the API.
// Every story also runs as a test in Chromium with axe (`npm run test:storybook`), in the dark and
// the light theme, and fails on an accessibility violation (EPSILON-169).
const config: StorybookConfig = {
	stories: ['../src/**/*.stories.svelte'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-a11y', '@storybook/addon-vitest'],
	framework: '@storybook/sveltekit'
};

export default config;
