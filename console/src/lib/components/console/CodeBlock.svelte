<!--
	A scrollable code or secret block. It is reachable by keyboard (tabindex="0"), as axe's
	scrollable-region-focusable asks, and stays dark in both themes.
-->
<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = { value: string; label?: string; class?: string };
	let { value, label, class: className }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (a scrollable code panel must be reachable by keyboard; axe scrollable-region-focusable) -->
<pre
	class={cn(
		'overflow-x-auto bg-surface-2 px-5 py-[18px] font-mono text-[13px] leading-[1.7] whitespace-pre text-code [tab-size:2]',
		className
	)}
	tabindex="0"
	aria-label={label}>{value}</pre>
