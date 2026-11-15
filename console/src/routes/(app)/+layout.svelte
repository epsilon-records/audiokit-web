<script lang="ts">
	import ConsoleShell from '#lib/components/ConsoleShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<ConsoleShell account={data.account} credits={data.credits} apiVersion={data.apiVersion}>
	{@render children()}
</ConsoleShell>
