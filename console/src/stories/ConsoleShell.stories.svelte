<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConsoleShell from '#lib/components/console/ConsoleShell.svelte';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import StatTile from '#lib/components/console/StatTile.svelte';
	import {
		account,
		apiVersion,
		creditsLeft,
		emptyCredits,
		emptyCreditsWithState,
		lowCredits,
		roomyCredits
	} from './mock-data';

	const { Story } = defineMeta({
		title: 'Console/ConsoleShell',
		component: ConsoleShell,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { account, credits: roomyCredits, apiVersion }
	});
</script>

<Story name="Dashboard">
	{#snippet template(args)}
		<ConsoleShell account={args.account} credits={args.credits} apiVersion={args.apiVersion}>
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
		<ConsoleShell account={args.account} credits={args.credits} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Payment failed" args={{ account: { ...account, pastDue: true } }}>
	{#snippet template(args)}
		<ConsoleShell account={args.account} credits={args.credits} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story
	name="Out of credits"
	args={{ credits: emptyCredits, now: new Date('2026-11-14T12:00:00.000Z') }}
>
	{#snippet template(args)}
		<ConsoleShell
			account={args.account}
			credits={args.credits}
			now={args.now}
			apiVersion={args.apiVersion}
		>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Balance unavailable" args={{ credits: null }}>
	{#snippet template(args)}
		<ConsoleShell account={args.account} credits={args.credits} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story name="Running low" args={{ credits: lowCredits }}>
	{#snippet template(args)}
		<ConsoleShell account={args.account} credits={args.credits} apiVersion={args.apiVersion}>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>

<Story
	name="Empty, with billing's low-balance state"
	args={{ credits: emptyCreditsWithState, now: new Date('2026-11-14T12:00:00.000Z') }}
>
	{#snippet template(args)}
		<ConsoleShell
			account={args.account}
			credits={args.credits}
			now={args.now}
			apiVersion={args.apiVersion}
		>
			<PageHeader title="Dashboard" />
		</ConsoleShell>
	{/snippet}
</Story>
