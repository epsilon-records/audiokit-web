<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, fn } from 'storybook/test';
	import { Button } from './index.js';

	// No `component` here: each story renders its own <Button>, so states are written out as markup.
	const { Story } = defineMeta({ title: 'UI/Button' });

	const onDisabledLinkClick = fn();
</script>

<Story name="Default">
	<Button>Copy</Button>
</Story>

<Story name="Primary">
	<Button variant="primary">Create key</Button>
</Story>

<Story name="Danger">
	<Button variant="danger">Revoke key</Button>
</Story>

<Story name="Small">
	<Button size="small">Edit</Button>
</Story>

<Story name="Disabled">
	<Button variant="primary" disabled>Create key</Button>
</Story>

<Story name="Link">
	<Button href="/usage">Usage</Button>
</Story>

<Story name="Primary link">
	<Button href="/api-keys" variant="primary">New key</Button>
</Story>

<Story name="Danger link">
	<Button href="/settings" variant="danger">Delete account</Button>
</Story>

<Story name="Text action">
	<p>Key ending 4f2a · <Button variant="link">Revoke</Button></p>
</Story>

<Story name="Long text">
	<div style="max-width: 320px">
		<Button variant="primary">Create a key for the production server and copy it now</Button>
	</div>
</Story>

<Story
	name="Disabled link"
	play={async ({ canvas, userEvent }) => {
		const link = canvas.getByRole('link', { name: 'New key' });
		await expect(link).toHaveAttribute('aria-disabled', 'true');
		await expect(link).not.toHaveAttribute('href');
		await userEvent.click(link);
		await expect(onDisabledLinkClick).not.toHaveBeenCalled();
	}}
>
	<Button href="/api-keys" variant="primary" disabled onclick={onDisabledLinkClick}>New key</Button>
</Story>
