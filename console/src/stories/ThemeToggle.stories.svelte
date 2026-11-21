<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';

	// System / Light / Dark (D3a). The pick sets data-theme on <html>, as static/theme-init.js does
	// before first paint.
	const { Story } = defineMeta({
		title: 'Site/ThemeToggle',
		component: ThemeToggle,
		tags: ['autodocs']
	});

	const root = () => document.documentElement;
</script>

<Story name="Default" />

<Story
	name="Cycling through themes"
	play={async ({ canvas, userEvent, globals }) => {
		const before = root().dataset.theme;
		const systemName = 'Theme: System. Switch to Light';
		const button = await canvas.findByRole('button');
		// The preview may have a saved choice. Reach System through the control before testing.
		for (let step = 0; step < 2 && button.getAttribute('aria-label') !== systemName; step++) {
			await userEvent.click(button);
		}
		const system = await canvas.findByRole('button', { name: systemName });

		await userEvent.click(system);
		const light = await canvas.findByRole('button', { name: 'Theme: Light. Switch to Dark' });
		await expect(root().dataset.theme).toBe('light');
		await expect(localStorage.getItem('ak-theme')).toBe('light');

		await userEvent.click(light);
		const dark = await canvas.findByRole('button', { name: 'Theme: Dark. Switch to System' });
		await expect(root().dataset.theme).toBe('dark');
		await expect(localStorage.getItem('ak-theme')).toBe('dark');

		await userEvent.click(dark);
		await canvas.findByRole('button', { name: systemName });
		await expect(localStorage.getItem('ak-theme')).toBeNull();

		// Leave the page in the theme this run checks.
		root().dataset.theme = globals.theme === 'light' ? 'light' : (before ?? 'dark');
	}}
/>
