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
	{#snippet template()}
		<ConsoleShell {account} usage={roomyUsage} {apiVersion}>
			<PageHeader title="Dashboard" description="Your credits and recent jobs." />
			<StatTile
				label="Credits left"
				value={String(creditsLeft)}
				hint="Free credits reset monthly"
			/>
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Email not confirmed">
	{#snippet template()}
		<ConsoleShell usage={roomyUsage} {apiVersion} account={{ ...account, emailVerified: false }}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Payment failed">
	{#snippet template()}
		<ConsoleShell usage={roomyUsage} {apiVersion} account={{ ...account, pastDue: true }}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>
