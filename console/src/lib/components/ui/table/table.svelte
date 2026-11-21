<!--
	shadcn-svelte Table in the console's style: a bordered, scrollable box. `stack` turns each row
	into a small card below 720 px: the header row hides, and each cell shows its column name from
	`data-label` above its value, so a phone never scrolls sideways.
-->
<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLTableAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		stack = false,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> & { stack?: boolean } = $props();

	const stacked = [
		'max-stack:block',
		'max-stack:[&_caption]:block',
		'max-stack:[&_thead]:hidden',
		'max-stack:[&_tbody]:block',
		'max-stack:[&_tr]:block max-stack:[&_tr]:py-2.5',
		'max-stack:[&_tbody_tr:first-child]:border-t-0',
		'max-stack:[&_td]:block max-stack:[&_td]:px-4 max-stack:[&_td]:py-[3px] max-stack:[&_td]:text-left max-stack:[&_td]:whitespace-normal',
		'max-stack:[&_td[data-label]]:before:block max-stack:[&_td[data-label]]:before:font-sans max-stack:[&_td[data-label]]:before:text-[12px] max-stack:[&_td[data-label]]:before:text-faint max-stack:[&_td[data-label]]:before:content-[attr(data-label)]'
	].join(' ');
</script>

<div
	data-slot="table-container"
	class="overflow-x-auto rounded-card border border-border bg-surface"
>
	<table
		bind:this={ref}
		data-slot="table"
		class={cn('w-full border-collapse text-[15px]', stack && stacked, className)}
		{...restProps}
	>
		{@render children?.()}
	</table>
</div>
