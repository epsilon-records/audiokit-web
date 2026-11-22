<script lang="ts">
	import { Tooltip as TooltipPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 6,
		children,
		...restProps
	}: TooltipPrimitive.ContentProps = $props();
</script>

<TooltipPrimitive.Portal>
	<TooltipPrimitive.Content
		bind:ref
		{sideOffset}
		data-slot="tooltip-content"
		class={cn(
			'z-50 max-w-[260px] rounded-control border border-line-strong bg-surface px-3 py-2 text-[13px] text-foreground shadow-[0_18px_40px_-24px_#000]',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
