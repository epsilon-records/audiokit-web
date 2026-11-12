<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SideNav from '#lib/components/SideNav.svelte';
	import { apiVersion } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/SideNav',
		component: SideNav,
		tags: ['autodocs'],
		args: { apiVersion }
	});

	const at = (path: string) => ({
		sveltekit_experimental: { state: { page: { url: new URL(`http://localhost${path}`) } } }
	});
</script>

<Story name="Dashboard" parameters={at('/dashboard')} />
<Story name="API keys" parameters={at('/api-keys')} />
<Story name="Settings, billing tab" parameters={at('/settings/billing')} />
