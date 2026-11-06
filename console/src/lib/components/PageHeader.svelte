<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		kicker?: string;
		description?: string;
		meta?: string;
		actions?: Snippet;
	};

	let { title, kicker, description, meta, actions }: Props = $props();
</script>

<header class="page-head">
	<div>
		{#if kicker}<p class="kicker">{kicker}</p>{/if}
		<h1>{title}</h1>
		{#if description}<p class="page-desc">{description}</p>{/if}
	</div>
	{#if actions}
		<div class="actions">
			{@render actions()}
		</div>
	{:else if meta}
		<p class="page-meta">{meta}</p>
	{/if}
</header>
