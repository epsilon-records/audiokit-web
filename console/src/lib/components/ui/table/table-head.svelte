<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLThAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		scope = 'col',
		children,
		...restProps
	}: WithElementRef<HTMLThAttributes> = $props();
</script>

<th
	bind:this={ref}
	data-slot="table-head"
	{scope}
	class={cn(
		'bg-band px-4 py-3 text-left align-middle text-[13px] font-medium text-faint',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
