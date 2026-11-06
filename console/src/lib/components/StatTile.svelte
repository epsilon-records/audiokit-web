<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		value: string;
		hint?: string;
		tone?: 'default' | 'warn';
		/** Optional embedded meter or action. */
		children?: Snippet;
	};

	let { label, value, hint, tone = 'default', children }: Props = $props();
</script>

<div class="stat-tile" class:stat-tile-warn={tone === 'warn'}>
	<p class="stat-label">{label}</p>
	<p class="stat-value">{value}</p>
	{#if hint}<p class="stat-hint">{hint}</p>{/if}
	{#if children}{@render children()}{/if}
</div>
