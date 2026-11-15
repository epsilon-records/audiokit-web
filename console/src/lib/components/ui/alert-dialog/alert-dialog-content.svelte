<!--
	shadcn-svelte Alert Dialog content on Bits UI: role="alertdialog", no ✕ and no closing on an
	outside click, so the person answers with Cancel or the action. Esc still cancels.
-->
<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<AlertDialogPrimitive.ContentProps> & { children: Snippet } = $props();
</script>

<AlertDialogPrimitive.Portal>
	<AlertDialogPrimitive.Overlay
		data-slot="alert-dialog-overlay"
		class="fixed inset-0 z-50 bg-black/66"
	/>
	<AlertDialogPrimitive.Content
		bind:ref
		data-slot="alert-dialog-content"
		class={cn(
			'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-card border border-line-strong bg-surface text-foreground shadow-[0_30px_80px_-40px_#000] outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
