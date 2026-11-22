<script lang="ts">
	import CodeBlock from '#lib/components/console/CodeBlock.svelte';
	import CopyButton from '#lib/components/console/CopyButton.svelte';
	import EmptyState from '#lib/components/console/EmptyState.svelte';
	import PageHeader from '#lib/components/console/PageHeader.svelte';
	import Panel from '#lib/components/console/Panel.svelte';
	import StatTile from '#lib/components/console/StatTile.svelte';
	import StatusBadge from '#lib/components/console/StatusBadge.svelte';
	import {
		actions,
		linkTarget,
		muted,
		section,
		sectionTitle
	} from '#lib/components/console/classes';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { outOfCreditsNotice } from '#lib/credits';
	import { formatDate, formatNumber, formatTime } from '#lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The balance comes from the layout (billing's GET /v1/credits); null means billing did not
	// answer in time, so no number is shown rather than a guess.
	const balance = $derived(data.credits?.balance ?? null);
	const outOfCredits = $derived(balance !== null && balance <= 0);
	const planLabel = $derived(
		{ free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[data.account.plan] ?? data.account.plan
	);
	const curl = $derived(
		`curl -X POST ${data.apiBaseUrl}/v1/jobs \\\n  -H "Authorization: Bearer $AUDIOKIT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"operation":"probe","url":"https://example.com/audio.mp3"}'`
	);
</script>

<svelte:head>
	<title>Dashboard · AudioKit console</title>
</svelte:head>

<PageHeader
	title="Dashboard"
	kicker="Overview"
	description="Your credit balance, this month's jobs, your plan and the keys that are active."
	meta="Times shown in UTC"
/>

<div class="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 max-stack:grid-cols-1">
	<StatTile
		label="Credit balance"
		value={balance === null ? 'Balance unavailable' : formatNumber(balance)}
		hint={outOfCredits
			? `Out of credits. ${outOfCreditsNotice(new Date())}`
			: 'Free credits renew each calendar month (UTC)'}
		tone={outOfCredits ? 'warn' : 'default'}
	/>

	<StatTile
		label="Jobs this month"
		value={formatNumber(data.usage.jobsUsed)}
		hint="Submitted this period · {planLabel} plan"
	/>

	<StatTile label="Plan" value={planLabel} hint="Resets {formatDate(data.account.renewsAt)}">
		<div class={actions}>
			<Button size="small" href="/pricing/" data-sveltekit-reload>Pricing</Button>
		</div>
	</StatTile>

	<StatTile
		label="API keys"
		value="{data.activeKeys} active"
		hint="Keys authorise jobs, which spend your credits"
	>
		<div class={actions}>
			<Button size="small" href="/api-keys">Manage</Button>
		</div>
	</StatTile>
</div>

<section class="{section} mb-7" aria-labelledby="recent-jobs">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class={sectionTitle} id="recent-jobs">Recent jobs</h2>
		<a class={linkTarget} href="/usage">View all →</a>
	</div>

	{#if data.jobs.length === 0}
		<EmptyState title="No jobs yet">
			Create an API key, then submit your first job.
			<div class={actions}>
				<Button variant="primary" size="small" href="/api-keys">Create API key</Button>
				<a class={linkTarget} href="https://audiokit.ai/docs/">Read the guide ↗</a>
			</div>
		</EmptyState>
	{:else}
		<Table.Root stack>
			<Table.Caption>Newest jobs first. Times shown in UTC.</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Job id</Table.Head>
					<Table.Head>Operation</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Created</Table.Head>
					<Table.Head><span class="sr-only">Detail</span></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.jobs as job (job.id)}
					<Table.Row>
						<Table.Cell class={Table.cellMono} data-label="Job id">… {job.id}</Table.Cell>
						<Table.Cell class={Table.cellMono} data-label="Operation">{job.operation}</Table.Cell>
						<Table.Cell data-label="Status"><StatusBadge status={job.status} /></Table.Cell>
						<Table.Cell class={Table.cellMono} data-label="Created">
							{formatDate(job.createdAt)} · {formatTime(job.createdAt)}
						</Table.Cell>
						<Table.Cell class="text-right" data-label="Detail">
							<Button variant="ghost" size="small" href="/usage">Detail →</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</section>

<section class={section} aria-labelledby="quick-start">
	<h2 class={sectionTitle} id="quick-start">Quick start</h2>
	<Panel code label="Base URL">
		{#snippet bar()}<CopyButton value={data.apiBaseUrl} label="Copy URL" />{/snippet}
		<div class="flex flex-col gap-4 p-5 max-stack:p-4">
			<p class={muted}>Base URL: <code>{data.apiBaseUrl}</code></p>
			<CodeBlock value={curl} label="Example job request" class="-mx-5 max-stack:-mx-4" />
			<a class="{linkTarget} self-start" href="https://audiokit.ai/docs/">Get started guide ↗</a>
		</div>
	</Panel>
</section>
