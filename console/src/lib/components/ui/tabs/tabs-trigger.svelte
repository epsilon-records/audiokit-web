<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		'-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent bg-transparent px-3.5 text-[15px] text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent data-[state=active]:border-accent data-[state=active]:text-foreground',
		className
	)}
	{...restProps}
/>
