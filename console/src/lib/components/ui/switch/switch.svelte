<!--
	Switch: a native <input type="checkbox" role="switch">, drawn as a track and thumb. Native for
	the same reason as Checkbox: it submits `name` and toggles with the keyboard before (or
	without) JavaScript. Screen readers announce it as a switch, on or off. Give it an `id` and a
	Label. The input itself is 44 px high and wide (the touch target); the 24 px track is drawn behind it.
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

<span data-slot="switch" class={cn('relative inline-grid h-11 w-11 shrink-0', className)}>
	<input
		bind:this={ref}
		type="checkbox"
		role="switch"
		data-slot="switch-input"
		bind:checked
		class="peer col-start-1 row-start-1 m-0 h-11 w-11 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
		{...restProps}
	/>
	<span
		aria-hidden="true"
		class="pointer-events-none col-start-1 row-start-1 h-6 w-11 self-center rounded-full border border-input bg-surface-2 peer-checked:border-accent peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50"
	></span>
	<span
		aria-hidden="true"
		class="pointer-events-none col-start-1 row-start-1 ml-[3px] size-[18px] self-center rounded-full bg-muted transition-transform peer-checked:translate-x-5 peer-checked:bg-primary-foreground motion-reduce:transition-none"
	></span>
</span>
