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

<button type="button" class="copy" onclick={copy}>
	{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
</button>
<span class="sr-only" aria-live="polite">
	{state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? 'Copy failed' : ''}
</span>
