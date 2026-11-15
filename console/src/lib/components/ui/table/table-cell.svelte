<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLTdAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTdAttributes> = $props();
</script>

<td
	bind:this={ref}
	data-slot="table-cell"
	class={cn('px-4 py-3 align-middle', className)}
	{...restProps}
>
	{@render children?.()}
</td>
