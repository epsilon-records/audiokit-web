<!--
	A panel: a bordered card with an optional bar (a mono caption on the left, an action such as
	Copy on the right) above its body. `code` makes it a dark island: it stays dark in the light
	theme, as a terminal does (app.css).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	type Props = HTMLAttributes<HTMLElement> & {
		/** The bar's caption. */
		label?: string;
		/** id for the caption, so a section can be labelled by it. */
		labelId?: string;
		/** Right-hand side of the bar. */
		bar?: Snippet;
		/** A code panel: dark in both themes. */
		code?: boolean;
		/** Render as <section> (with aria-labelledby) rather than <div>. */
		as?: 'div' | 'section';
		children?: Snippet;
	};

	let {
		label,
		labelId,
		bar,
		code = false,
		as = 'div',
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<svelte:element
	this={as}
	class={cn(
		'overflow-hidden rounded-card border border-border bg-surface text-foreground',
		code && 'dark-island',
		className
	)}
	{...rest}
>
	{#if label || bar}
		<div
			class="flex min-h-11 items-center justify-between gap-3 border-b border-border py-1 pr-1 pl-4 font-mono text-[12px] text-faint"
		>
			<span id={labelId} class="min-w-0 truncate">{label}</span>
			{#if bar}{@render bar()}{/if}
		</div>
	{/if}
	{@render children?.()}
</svelte:element>
