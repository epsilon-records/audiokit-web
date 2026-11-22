<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		level = 2,
		...restProps
	}: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
	bind:ref
	{level}
	data-slot="dialog-title"
	class={cn('text-[18px] leading-snug font-bold tracking-[-0.01em]', className)}
	{...restProps}
/>
