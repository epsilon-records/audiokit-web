<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatusBadge, { type BadgeStatus } from '#lib/components/StatusBadge.svelte';

	const { Story } = defineMeta({
		title: 'Console/StatusBadge',
		component: StatusBadge,
		tags: ['autodocs'],
		args: { status: 'succeeded' }
	});

	const jobStatuses: BadgeStatus[] = ['succeeded', 'running', 'queued', 'failed'];
	const keyStatuses: BadgeStatus[] = ['active', 'revoked'];
</script>

<Story name="Succeeded" />
<Story name="Failed" args={{ status: 'failed' }} />

<Story name="Job statuses">
	{#snippet template()}
		<div class="actions">
			{#each jobStatuses as status (status)}<StatusBadge {status} />{/each}
		</div>
	{/snippet}
</Story>

<Story name="API key statuses">
	{#snippet template()}
		<div class="actions">
			{#each keyStatuses as status (status)}<StatusBadge {status} />{/each}
		</div>
	{/snippet}
</Story>
