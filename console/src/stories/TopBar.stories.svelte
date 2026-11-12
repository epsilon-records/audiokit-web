<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TopBar from '#lib/components/TopBar.svelte';
	import { account } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/TopBar',
		component: TopBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { account, drawerOpen: false, onToggleDrawer: () => {} }
	});
</script>

<Story name="Free plan" />
<Story name="Payment failed" args={{ account: { ...account, pastDue: true } }} />
<Story name="Navigation open" args={{ drawerOpen: true }} />
