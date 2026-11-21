<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Checkbox } from './checkbox/index.js';
	import * as Field from './field/index.js';
	import { Input } from './input/index.js';
	import { Label } from './label/index.js';
	import * as NativeSelect from './native-select/index.js';
	import { Textarea } from './textarea/index.js';
	import { Button } from './button/index.js';

	const { Story } = defineMeta({ title: 'UI/Form controls' });
</script>

<Story name="Input">
	<div class="max-w-[480px]">
		<Field.Field>
			<Field.Label for="s-name">Key name</Field.Label>
			<Input id="s-name" name="name" placeholder="Production server" />
			<Field.Description>Shown in the key list so you can tell your keys apart.</Field.Description>
		</Field.Field>
	</div>
</Story>

<Story name="Input with error">
	<div class="max-w-[480px]">
		<Field.Field data-invalid="true">
			<Field.Label for="s-email">Email</Field.Label>
			<Input
				id="s-email"
				name="email"
				type="email"
				value="ana@"
				aria-invalid="true"
				aria-describedby="s-email-error"
			/>
			<Field.Error id="s-email-error" errors={[{ message: 'Enter a full email address.' }]} />
		</Field.Field>
	</div>
</Story>

<Story name="Disabled input">
	<div class="max-w-[480px]">
		<Field.Field>
			<Field.Label for="s-prefix">Key prefix</Field.Label>
			<Input id="s-prefix" value="ak_3f9a" disabled />
		</Field.Field>
	</div>
</Story>

<Story name="Textarea">
	<div class="max-w-[480px]">
		<Field.Field>
			<Field.Label for="s-notes">Notes</Field.Label>
			<Textarea id="s-notes" name="notes" placeholder="What this key is for" />
		</Field.Field>
	</div>
</Story>

<Story name="Select">
	<div class="max-w-[480px]">
		<Field.Field>
			<Field.Label for="s-op">Operation</Field.Label>
			<NativeSelect.Root id="s-op" name="operation" value="analyze">
				<NativeSelect.Option value="loudness">loudness</NativeSelect.Option>
				<NativeSelect.Option value="analyze">analyze</NativeSelect.Option>
				<NativeSelect.Option value="tempo">tempo</NativeSelect.Option>
			</NativeSelect.Root>
		</Field.Field>
	</div>
</Story>

<Story name="Small select">
	<label for="s-op-sm" class="sr-only">Operation</label>
	<NativeSelect.Root id="s-op-sm" name="operation" size="sm" value="loudness">
		<NativeSelect.Option value="loudness">loudness</NativeSelect.Option>
		<NativeSelect.Option value="tempo">tempo</NativeSelect.Option>
	</NativeSelect.Root>
</Story>

<Story name="Checkbox">
	<div class="flex items-center gap-2">
		<Checkbox id="s-terms" name="terms" />
		<Label for="s-terms">I agree to the terms</Label>
	</div>
</Story>

<Story name="Checked checkbox">
	<div class="flex items-center gap-2">
		<Checkbox id="s-usage" name="usage" checked />
		<Label for="s-usage">Email me a monthly usage summary</Label>
	</div>
</Story>

<Story name="Form rows (responsive)">
	<form class="flex flex-col gap-4" onsubmit={(e) => e.preventDefault()}>
		<Field.Field orientation="responsive">
			<Field.Label for="s-r-email">Email</Field.Label>
			<Input id="s-r-email" type="email" placeholder="you@example.com" />
		</Field.Field>
		<Field.Field orientation="responsive">
			<Field.Label for="s-r-role">Operation</Field.Label>
			<NativeSelect.Root id="s-r-role" value="analyze">
				<NativeSelect.Option value="analyze">analyze</NativeSelect.Option>
				<NativeSelect.Option value="tempo">tempo</NativeSelect.Option>
			</NativeSelect.Root>
		</Field.Field>
		<div class="sm:pl-[160px]"><Button type="submit" variant="primary">Create key</Button></div>
	</form>
</Story>

<Story name="Field set">
	<Field.Set>
		<Field.Legend>Notifications</Field.Legend>
		<Field.Group>
			<Field.Field orientation="horizontal">
				<Checkbox id="s-n1" checked />
				<Field.Label for="s-n1">Job failed</Field.Label>
			</Field.Field>
			<Field.Field orientation="horizontal">
				<Checkbox id="s-n2" />
				<Field.Label for="s-n2">Monthly usage summary</Field.Label>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</Story>
