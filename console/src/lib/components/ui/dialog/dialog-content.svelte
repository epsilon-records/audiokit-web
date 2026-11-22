<!--
	shadcn-svelte Dialog content on Bits UI: a portal, the overlay, focus trapped inside, Esc and
	the ✕ button close it, and focus returns to what opened it. In the console's panel style.
-->
<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import DialogOverlay from './dialog-overlay.svelte';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		showCloseButton = true,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		children: Snippet;
		/** Hide the ✕ while a destructive request is in flight. */
		showCloseButton?: boolean;
	} = $props();
</script>

<DialogPrimitive.Portal>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-card border border-line-strong bg-surface text-foreground shadow-[0_30px_80px_-40px_#000] outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close
				class="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-control bg-transparent text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent"
			>
				<span aria-hidden="true">✕</span>
				<span class="sr-only">Close dialog</span>
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
