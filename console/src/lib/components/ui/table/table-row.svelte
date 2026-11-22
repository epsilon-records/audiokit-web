<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn(
		'border-t border-border [thead_&]:border-t-0 [tbody_&]:hover:bg-foreground/[0.02]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
