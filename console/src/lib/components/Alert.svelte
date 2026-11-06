<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		tone?: 'info' | 'ok' | 'warn';
		/** `alert` for things the user must notice now, `status` otherwise. */
		role?: 'status' | 'alert';
		children: Snippet;
	};

	let { tone = 'info', role = 'status', children }: Props = $props();

	const toneClass = $derived(tone === 'warn' ? 'banner-warn' : tone === 'ok' ? 'banner-ok' : '');
</script>

<div class="banner {toneClass}" {role}>
	{@render children()}
</div>
