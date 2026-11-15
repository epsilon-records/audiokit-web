<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		children?: Snippet;
		actions?: Snippet;
	};

	let { title, children, actions }: Props = $props();
</script>

<div
	class="flex flex-col items-start gap-2.5 rounded-card border border-dashed border-line-strong bg-surface-2 p-7 text-[15px] text-muted max-stack:p-5"
>
	<h2 class="text-[18px] font-bold text-foreground">{title}</h2>
	{#if children}{@render children()}{/if}
	{#if actions}<div class="flex flex-wrap items-center gap-3">{@render actions()}</div>{/if}
</div>
