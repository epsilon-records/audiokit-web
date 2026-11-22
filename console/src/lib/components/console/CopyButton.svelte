<script lang="ts">
	type Props = {
		value: string;
		label?: string;
	};

	let { value, label = 'Copy' }: Props = $props();

	let state: 'idle' | 'copied' | 'failed' = $state('idle');

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			state = 'copied';
		} catch {
			state = 'failed';
		}
	}
</script>

<!-- 44 px tall for touch; the visible box is the inner span, as compact as before. -->
<button
	type="button"
	class="group inline-flex min-h-11 items-center bg-transparent px-1 font-mono text-[12px] font-medium text-muted focus-visible:outline-none"
	onclick={copy}
>
	<span
		class="rounded-[4px] border border-input px-2.5 py-1 group-hover:border-accent group-hover:text-accent group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent"
	>
		{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
	</span>
</button>
<span class="sr-only" aria-live="polite">
	{state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''}
</span>
