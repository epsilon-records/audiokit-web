<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConsoleShell from '#lib/components/ConsoleShell.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import { account, apiVersion, creditsLeft, roomyUsage } from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/ConsoleShell',
		component: ConsoleShell,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { account, usage: roomyUsage, apiVersion }
	});
</script>

<Story name="Dashboard">
	{#snippet template(args)}
		<ConsoleShell account={args.account} usage={args.usage} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" description="Your credits and recent jobs." />
			<StatTile
				label="Credits left"
				value={String(creditsLeft)}
				hint="Free credits reset monthly"
			/>
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Email not confirmed" args={{ account: { ...account, emailVerified: false } }}>
	{#snippet template(args)}
		<ConsoleShell account={args.account} usage={args.usage} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Payment failed" args={{ account: { ...account, pastDue: true } }}>
	{#snippet template(args)}
		<ConsoleShell account={args.account} usage={args.usage} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>
