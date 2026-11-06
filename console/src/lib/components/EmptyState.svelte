<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		children?: Snippet;
		actions?: Snippet;
	};

	let { title, children, actions }: Props = $props();
</script>

<div class="empty-state">
	<h2>{title}</h2>
	{#if children}{@render children()}{/if}
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>
