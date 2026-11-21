<!--
	Switch: a native <input type="checkbox" role="switch">, drawn as a track and thumb. Native for
	the same reason as Checkbox: it submits `name` and toggles with the keyboard before (or
	without) JavaScript. Screen readers announce it as a switch, on or off. Give it an `id` and a
	Label. The 44 px row around it is the touch target.
-->
<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		...restProps
	}: WithElementRef<Omit<HTMLInputAttributes, 'type' | 'role'>, HTMLInputElement> = $props();
</script>

<span data-slot="switch" class={cn('relative inline-grid h-6 w-11 shrink-0', className)}>
	<input
		bind:this={ref}
		type="checkbox"
		role="switch"
		data-slot="switch-input"
		bind:checked
		class="peer col-start-1 row-start-1 m-0 h-6 w-11 cursor-pointer appearance-none rounded-full border border-input bg-surface-2 checked:border-accent checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
		{...restProps}
	/>
	<span
		aria-hidden="true"
		class="pointer-events-none col-start-1 row-start-1 ml-[3px] size-[18px] self-center rounded-full bg-muted transition-transform peer-checked:translate-x-5 peer-checked:bg-primary-foreground motion-reduce:transition-none"
	></span>
</span>
