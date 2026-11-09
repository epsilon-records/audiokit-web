<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		subtitle?: string;
		children: Snippet;
	};

	let { title, subtitle, children }: Props = $props();
</script>

<main class="auth-wrap">
	<div class="auth-brand">
		<a class="brand" href="https://audiokit.ai/">
			<span class="brand-mark" aria-hidden="true">✦</span>
			AudioKit
		</a>
	</div>

	<section class="auth-card" aria-labelledby="auth-title">
		<div>
			<h1 class="auth-title" id="auth-title">{title}</h1>
			{#if subtitle}<p class="auth-sub">{subtitle}</p>{/if}
		</div>
		{@render children()}
	</section>

	<footer class="auth-foot">
		<p>
			Read the <a href="https://audiokit.ai/docs/">docs</a> ↗ ·
			<a href="https://audiokit.ai/privacy/">Privacy notice</a> ↗
		</p>
	</footer>
</main>
