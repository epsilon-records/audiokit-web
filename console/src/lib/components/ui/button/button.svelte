<script lang="ts" module>
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { tv, type VariantProps } from 'tailwind-variants';

	/** Mirrors the console's `.btn` look (44 px touch target, 6 px corners, Space Grotesk 600) so pages can move over one by one. */
	export const buttonVariants = tv({
		base: 'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border font-sans font-semibold whitespace-nowrap no-underline transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55',
		variants: {
			variant: {
				/** The secondary button (the old `.btn-ghost`): a --line-control border at 3:1. */
				default:
					'border-border-strong bg-transparent text-foreground hover:border-accent hover:text-accent',
				primary:
					'border-transparent bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent',
				danger: 'border-warn bg-transparent text-warn hover:bg-warn/12 hover:text-warn',
				ghost: 'border-transparent bg-transparent font-medium text-muted hover:text-accent',
				/** Inline text action: no box, no touch-target padding. */
				link: 'border-0 bg-transparent font-normal text-accent underline underline-offset-3 hover:text-accent-hover'
			},
			size: {
				default: 'min-h-11 px-[18px] text-[15px]',
				small: 'min-h-[38px] px-3.5 text-[14px]'
			}
		},
		compoundVariants: [{ variant: 'link', class: 'min-h-0 px-0 text-[length:inherit]' }],
		defaultVariants: { variant: 'default', size: 'default' }
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = (HTMLButtonAttributes & HTMLAnchorAttributes) & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		ref?: HTMLElement | null;
	};
</script>

<script lang="ts">
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		onclick,
		...rest
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		onclick={disabled ? undefined : onclick}
		{...rest}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{onclick}
		{...rest}
	>
		{@render children?.()}
	</button>
{/if}
