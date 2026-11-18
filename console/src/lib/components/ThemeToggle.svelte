<script lang="ts">
	// System / Light / Dark (D3a, EPSILON-169). static/theme-init.js applies the pick before first
	// paint; this control changes it afterwards. Storage lives in #lib/theme (AudioKit 0079).
	import { onMount } from 'svelte';
	import { browserStorage, readStored, resolve, store, type ThemeChoice } from '#lib/theme';

	const options: { value: ThemeChoice; label: string }[] = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];
	let choice = $state<ThemeChoice>('system');

	onMount(() => {
		// The page's own record comes first: it holds a pick that couldn't be stored, for example
		// when client-side navigation remounts this toggle.
		const recorded = document.documentElement.dataset.themeChoice;
		choice =
			recorded === 'system' || recorded === 'light' || recorded === 'dark'
				? recorded
				: readStored(browserStorage());
	});

	function pick(next: ThemeChoice) {
		choice = next;
		store(browserStorage(), next);
		// The page's own record of the pick, read by theme-init.js when the system theme changes,
		// so a pick that couldn't be stored still holds for this page.
		document.documentElement.dataset.themeChoice = next;
		const light = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
		document.documentElement.dataset.theme = resolve(next, light);
	}
</script>

<div class="theme-toggle" role="group" aria-label="Theme">
	{#each options as o (o.value)}
		<button type="button" aria-pressed={choice === o.value} onclick={() => pick(o.value)}
			>{o.label}</button
		>
	{/each}
</div>

<style>
	.theme-toggle {
		display: inline-flex;
		align-self: flex-start;
		border: 1px solid var(--line-control);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	button {
		min-height: 44px;
		min-width: 44px;
		padding: 0 12px;
		border: 0;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	button + button {
		border-left: 1px solid var(--line);
	}
	button:hover {
		color: var(--accent);
	}
	button[aria-pressed='true'] {
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 600;
	}
	button:focus-visible {
		outline-offset: -4px;
	}
	button[aria-pressed='true']:focus-visible {
		outline-color: var(--accent-ink);
	}
</style>
