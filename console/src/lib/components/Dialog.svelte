<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		title: string;
		children: Snippet;
		actions?: Snippet;
		/** Hide the close button while a destructive request is in flight. */
		dismissible?: boolean;
	};

	let { open = $bindable(false), title, children, actions, dismissible = true }: Props = $props();

	const titleId = $props.id();
	let dialog: HTMLDialogElement | undefined = $state();

	// Keep the native <dialog> in sync with the bindable `open` prop. Native
	// dialogs give us the focus trap and Esc handling for free.
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	function close() {
		open = false;
	}
</script>

<dialog bind:this={dialog} aria-labelledby={titleId} onclose={close}>
	<div class="dialog-head">
		<h2 id={titleId}>{title}</h2>
		{#if dismissible}
			<button type="button" class="dialog-close" onclick={close} aria-label="Close dialog">✕</button
			>
		{/if}
	</div>
	<div class="dialog-body">
		{@render children()}
	</div>
	{#if actions}
		<div class="dialog-actions">
			{@render actions()}
		</div>
	{/if}
</dialog>
