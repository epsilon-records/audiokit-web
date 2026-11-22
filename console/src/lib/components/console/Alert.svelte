<!--
	A notice: a banner above a page's content, or an inline result in a form. Tone sets the
	colour; the words carry the meaning.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	type Props = {
		tone?: 'info' | 'ok' | 'warn';
		/** `alert` for things the user must notice now, `status` otherwise. */
		role?: 'status' | 'alert';
		/** Extra classes, e.g. the margin a banner keeps below it. */
		class?: string;
		children: Snippet;
	};

	let { tone = 'info', role = 'status', class: className, children }: Props = $props();

	const tones = {
		info: 'border-accent/35 bg-accent-soft',
		ok: 'border-ok/40 bg-ok/8',
		warn: 'border-warn/40 bg-warn/10'
	};
</script>

<div
	class={cn(
		'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control border px-4 py-2.5 text-[14px] text-soft [&_strong]:text-foreground',
		tones[tone],
		className
	)}
	{role}
>
	{@render children()}
</div>
