<script lang="ts">
	// The sign-in screens use the console's base styles (Preflight) like the signed-in app.
	import '../../../console.css';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		subtitle?: string;
		children: Snippet;
	};

	let { title, subtitle, children }: Props = $props();
</script>

<main
	class="flex min-h-screen flex-col items-center justify-center gap-[18px] px-5 py-12 max-stack:px-4"
>
	<div class="flex flex-col gap-1.5">
		<a
			class="flex min-h-11 items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em] hover:text-foreground"
			href="https://audiokit.ai/"
		>
			<span class="text-accent" aria-hidden="true">✦</span>
			AudioKit
		</a>
	</div>

	<section
		class="flex w-full max-w-[420px] min-w-0 flex-col gap-5 rounded-card border border-border bg-surface p-7 max-stack:p-5 [&_h2]:text-[17px] [&_h2]:font-bold"
		aria-labelledby="auth-title"
	>
		<div>
			<h1 class="text-[24px] leading-[1.2] font-bold tracking-[-0.02em]" id="auth-title">
				{title}
			</h1>
			{#if subtitle}<p class="mt-1 text-[15px] text-muted">{subtitle}</p>{/if}
		</div>
		{@render children()}
	</section>

	<footer class="flex w-full max-w-[420px] flex-col gap-2 text-center text-[14px] text-faint">
		<p>
			Read the <a class="text-accent" href="https://audiokit.ai/docs/" data-sveltekit-reload>docs</a> ↗ ·
			<a class="text-accent" href="https://audiokit.ai/privacy/" data-sveltekit-reload>Privacy notice</a> ↗
		</p>
	</footer>
</main>
