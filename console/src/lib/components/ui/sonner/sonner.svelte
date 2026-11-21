<!--
	shadcn-svelte Sonner: toasts for the result of an action ("Profile saved."). They are announced
	in a polite live region. A toast only adds to the page: every result it reports is also on the
	page after a reload, or in a <noscript> notice where the page has none.
-->
<script lang="ts">
	import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner';

	let { ...restProps }: ToasterProps = $props();
</script>

<Sonner
	class="toaster group"
	position="bottom-right"
	closeButton={false}
	style="--normal-bg: var(--panel); --normal-text: var(--text); --normal-border: var(--line-strong); --success-bg: var(--panel); --success-text: var(--text); --success-border: color-mix(in srgb, var(--ok) 45%, transparent); --error-bg: var(--panel); --error-text: var(--text); --error-border: color-mix(in srgb, var(--warn) 45%, transparent); --border-radius: var(--radius-sm); font-family: var(--sans)"
	toastOptions={{ classes: { toast: 'text-[14px]' } }}
	{...restProps}
/>
