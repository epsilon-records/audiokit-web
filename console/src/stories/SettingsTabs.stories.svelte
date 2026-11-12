<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SettingsTabs from '#lib/components/SettingsTabs.svelte';

	const { Story } = defineMeta({
		title: 'Console/SettingsTabs',
		component: SettingsTabs,
		tags: ['autodocs']
	});

	const at = (path: string) => ({
		sveltekit_experimental: { state: { page: { url: new URL(`http://localhost${path}`) } } }
	});
</script>

<Story name="Profile" parameters={at('/settings')} />
<Story name="Billing" parameters={at('/settings/billing')} />
