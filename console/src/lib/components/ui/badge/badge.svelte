<!--
	Badge: a short state label (job state, key state, low balance). A coloured dot and text in the
	tone's colour, as the console's status badges have always read. The text carries the meaning;
	the colour only repeats it.
-->
<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap before:size-[7px] before:flex-none before:rounded-full before:content-[""]',
		variants: {
			tone: {
				ok: 'text-ok before:bg-ok',
				warn: 'text-warn before:bg-warn',
				accent: 'text-accent before:bg-accent',
				muted: 'text-faint before:bg-faint'
			}
		},
		defaultVariants: { tone: 'muted' }
	});

	export type BadgeTone = VariantProps<typeof badgeVariants>['tone'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		tone = 'muted',
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> & { tone?: BadgeTone } = $props();
</script>

<span
	bind:this={ref}
	data-slot="badge"
	class={cn(badgeVariants({ tone }), className)}
	{...restProps}
>
	{@render children?.()}
</span>
