<script lang="ts">
	import ConsoleShell from '#lib/components/ConsoleShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<ConsoleShell account={data.account} usage={data.usage} apiVersion={data.apiVersion}>
	{@render children()}
</ConsoleShell>
