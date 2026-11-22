<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, waitFor, within } from 'storybook/test';
	import * as AlertDialog from './alert-dialog/index.js';
	import { Badge } from './badge/index.js';
	import { Button } from './button/index.js';
	import * as Dialog from './dialog/index.js';
	import * as Field from './field/index.js';
	import { Input } from './input/index.js';
	import { Toaster, toast } from './sonner/index.js';
	import { Switch } from './switch/index.js';
	import * as Table from './table/index.js';
	import * as Tabs from './tabs/index.js';
	import * as Tooltip from './tooltip/index.js';

	// The overlays and small parts EPSILON-169 PR 3 adds from shadcn-svelte, in the console's style.
	const { Story } = defineMeta({ title: 'UI/Overlays and parts' });
</script>

<Story
	name="Dialog"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', { name: 'Create key' }));
		const dialog = within(document.body).getByRole('dialog', { name: 'Create API key' });
		await expect(dialog).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect(canvas.getByRole('button', { name: 'Create key' })).toHaveFocus();
	}}
>
	<Dialog.Root>
		<Dialog.Trigger>
			{#snippet child({ props })}<Button variant="primary" {...props}>Create key</Button>{/snippet}
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header><Dialog.Title>Create API key</Dialog.Title></Dialog.Header>
			<Dialog.Body>
				<Field.Field>
					<Field.Label for="story-label">Label (optional)</Field.Label>
					<Input id="story-label" placeholder="staging" />
				</Field.Field>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}<Button {...props}>Cancel</Button>{/snippet}
				</Dialog.Close>
				<Button variant="primary">Create key</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</Story>

<Story
	name="Alert Dialog"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', { name: 'Revoke' }));
		const dialog = within(document.body).getByRole('alertdialog', { name: 'Revoke API key' });
		await expect(dialog).toBeVisible();
		await userEvent.click(within(dialog).getByRole('button', { name: 'Keep key' }));
	}}
>
	<AlertDialog.Root>
		<AlertDialog.Trigger>
			{#snippet child({ props })}<Button variant="ghost" size="small" {...props}>Revoke</Button
				>{/snippet}
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header class="pr-5"
				><AlertDialog.Title>Revoke API key</AlertDialog.Title></AlertDialog.Header
			>
			<AlertDialog.Body>
				<AlertDialog.Description>
					Revoke <strong>production</strong> (ak_live_…4f2)? Any client using this key will start failing
					immediately. This can't be undone.
				</AlertDialog.Description>
			</AlertDialog.Body>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Keep key</AlertDialog.Cancel>
				<Button variant="danger">Revoke key</Button>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</Story>

<Story
	name="Toast"
	play={async ({ canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole('button', { name: 'Save preferences' }));
		const message = await within(document.body).findByText('Preferences saved.');
		await waitFor(() => expect(message).toBeVisible());
	}}
>
	<Button variant="primary" onclick={() => toast.success('Preferences saved.')}
		>Save preferences</Button
	>
	<Toaster />
</Story>

<Story name="Badge">
	<div class="flex flex-wrap gap-4">
		<Badge tone="ok">OK</Badge>
		<Badge tone="warn">Low</Badge>
		<Badge tone="warn">Empty</Badge>
		<Badge tone="accent">running</Badge>
		<Badge tone="muted">queued</Badge>
	</div>
</Story>

<Story name="Switch">
	<div class="flex min-h-11 items-start gap-3">
		<Switch
			id="story-switch"
			name="lowBalanceAlerts"
			checked
			aria-describedby="story-switch-hint"
		/>
		<div class="flex flex-col gap-0.5">
			<Field.Label for="story-switch" class="font-bold">Low-balance alerts</Field.Label>
			<Field.Description id="story-switch-hint"
				>An email when your credit balance runs low, and one when it reaches zero.</Field.Description
			>
		</div>
	</div>
</Story>

<Story name="Tooltip">
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}<Button size="small" {...props}>Docs runs</Button>{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>Repeats what the page says; never the only place it is said.</Tooltip.Content
			>
		</Tooltip.Root>
	</Tooltip.Provider>
</Story>

<Story name="Tabs">
	<Tabs.Root value="curl">
		<Tabs.List aria-label="Code sample">
			<Tabs.Trigger value="curl">curl</Tabs.Trigger>
			<Tabs.Trigger value="js">JavaScript</Tabs.Trigger>
			<Tabs.Trigger value="py">Python</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="curl"><p>curl sample</p></Tabs.Content>
		<Tabs.Content value="js"><p>JavaScript sample</p></Tabs.Content>
		<Tabs.Content value="py"><p>Python sample</p></Tabs.Content>
	</Tabs.Root>
</Story>

<Story name="Table, stacked under 720 px">
	<Table.Root stack>
		<Table.Caption>Credits you can spend, in the order jobs use them.</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>Source</Table.Head>
				<Table.Head class="text-right">Remaining</Table.Head>
				<Table.Head>Expiry</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			<Table.Row>
				<Table.Cell data-label="Source">Free monthly</Table.Cell>
				<Table.Cell class={Table.cellNumeric} data-label="Remaining">16 of 100</Table.Cell>
				<Table.Cell data-label="Expiry">Lapses 1 December 2026 (UTC)</Table.Cell>
			</Table.Row>
			<Table.Row>
				<Table.Cell data-label="Source">Purchased</Table.Cell>
				<Table.Cell class={Table.cellNumeric} data-label="Remaining">1,000 of 1,000</Table.Cell>
				<Table.Cell data-label="Expiry">Never expires</Table.Cell>
			</Table.Row>
		</Table.Body>
	</Table.Root>
</Story>
