<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		level = 2,
		...restProps
	}: AlertDialogPrimitive.TitleProps = $props();
</script>

<AlertDialogPrimitive.Title
	bind:ref
	{level}
	data-slot="alert-dialog-title"
	class={cn('text-[18px] leading-snug font-bold tracking-[-0.01em]', className)}
	{...restProps}
/>
