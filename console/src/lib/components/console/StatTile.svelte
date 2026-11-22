<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	type Props = {
		label: string;
		value: string;
		hint?: string;
		tone?: 'default' | 'warn';
		/** Optional embedded badge or action. */
		children?: Snippet;
	};

	let { label, value, hint, tone = 'default', children }: Props = $props();
</script>

<div
	class={cn(
		'flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-[18px] py-4',
		tone === 'warn' && 'border-warn/45'
	)}
>
	<p class="text-[12px] tracking-[0.06em] text-faint uppercase">{label}</p>
	<p
		class={cn(
			'font-mono text-[26px] leading-[1.15] [overflow-wrap:anywhere]',
			tone === 'warn' ? 'text-warn' : 'text-foreground'
		)}
	>
		{value}
	</p>
	{#if hint}<p class="text-[13px] text-muted">{hint}</p>{/if}
	{#if children}{@render children()}{/if}
</div>
