import type { StorybookConfig } from '@storybook/sveltekit';

// AudioKit's Storybook (knowledge decision 0064). It renders the console's shared components
// with mocked data only: the mock adapter and fixtures, never the billing service or the API.
const config: StorybookConfig = {
	stories: ['../src/**/*.stories.svelte'],
	addons: ['@storybook/addon-svelte-csf'],
	framework: '@storybook/sveltekit'
};

export default config;
