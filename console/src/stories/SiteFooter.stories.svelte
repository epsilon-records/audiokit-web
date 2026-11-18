<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import { apiVersion } from './mock-data';

	const { Story } = defineMeta({
		title: 'Site/SiteFooter',
		component: SiteFooter,
		tags: ['autodocs'],
		args: { apiVersion },
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Default" />
