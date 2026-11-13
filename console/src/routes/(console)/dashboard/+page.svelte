<script lang="ts">
	import CopyButton from '#lib/components/CopyButton.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
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

<div class="stat-grid">
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
		<div class="actions">
			<a class="btn btn-ghost btn-sm" href="/pricing">Pricing</a>
		</div>
	</StatTile>

	<StatTile
		label="API keys"
		value="{data.activeKeys} active"
		hint="Keys authorise jobs, which spend your credits"
	>
		<div class="actions">
			<a class="btn btn-ghost btn-sm" href="/api-keys">Manage</a>
		</div>
	</StatTile>
</div>

<section class="section-block" aria-labelledby="recent-jobs">
	<div class="actions spread">
		<h2 id="recent-jobs">Recent jobs</h2>
		<a class="link" href="/usage">View all →</a>
	</div>

	{#if data.jobs.length === 0}
		<EmptyState title="No jobs yet">
			Create an API key, then submit your first job.
			<div class="actions">
				<a class="btn btn-primary btn-sm" href="/api-keys">Create API key</a>
				<a class="link" href="https://audiokit.ai/docs/">Read the guide ↗</a>
			</div>
		</EmptyState>
	{:else}
		<div class="table-box">
			<table class="stack">
				<caption>Newest jobs first. Times shown in UTC.</caption>
				<thead>
					<tr>
						<th scope="col">Job id</th>
						<th scope="col">Operation</th>
						<th scope="col">Status</th>
						<th scope="col">Created</th>
						<th scope="col"><span class="sr-only">Detail</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.jobs as job (job.id)}
						<tr>
							<td class="mono" data-label="Job id">… {job.id}</td>
							<td class="mono" data-label="Operation">{job.operation}</td>
							<td data-label="Status"><StatusBadge status={job.status} /></td>
							<td class="mono" data-label="Created">
								{formatDate(job.createdAt)} · {formatTime(job.createdAt)}
							</td>
							<td class="row-actions" data-label="Detail">
								<a class="btn btn-quiet btn-sm" href="/usage">Detail →</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<section class="section-block" aria-labelledby="quick-start">
	<h2 id="quick-start">Quick start</h2>
	<div class="panel">
		<div class="panel-bar">
			<span>Base URL</span>
			<CopyButton value={data.apiBaseUrl} label="Copy URL" />
		</div>
		<div class="panel-body">
			<p class="muted">Base URL: <code>{data.apiBaseUrl}</code></p>
			<pre class="code" aria-label="Example job request">{curl}</pre>
			<a class="link" href="https://audiokit.ai/docs/">Get started guide ↗</a>
		</div>
	</div>
</section>
