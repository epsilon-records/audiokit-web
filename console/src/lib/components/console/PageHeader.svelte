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

<header
	class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4 max-stack:items-start"
>
	<div class="min-w-0">
		{#if kicker}<p class="font-mono text-[13px] text-accent">{kicker}</p>{/if}
		<h1 class="mt-1 text-[clamp(24px,3vw,30px)] leading-[1.15] font-bold tracking-[-0.02em]">
			{title}
		</h1>
		{#if description}<p class="mt-1.5 max-w-[62ch] text-[15px] text-muted">{description}</p>{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-3">
			{@render actions()}
		</div>
	{:else if meta}
		<p class="font-mono text-[12px] text-faint">{meta}</p>
	{/if}
</header>
