import type { ComponentProps } from 'svelte';
import { describe, expect, it } from 'vitest';
import type { Input } from '../src/lib/components/ui/input/index.js';

// CodeRabbit on #66: Input binds `value`, which Svelte refuses on a checkbox, so the type must
// reject `type="checkbox"`. `npm run check` (svelte-check) enforces the @ts-expect-error lines:
// if the type ever accepts them again, the check fails.

type Props = ComponentProps<typeof Input>;

describe('Input type', () => {
	it('rejects checkbox and radio, and accepts text-like types', () => {
		// @ts-expect-error checkboxes use the Checkbox component
		const checkbox: Props = { type: 'checkbox' };
		// @ts-expect-error radios can't bind value either
		const radio: Props = { type: 'radio' };
		const email: Props = { type: 'email' };
		const file: Props = { type: 'file' };
		expect([checkbox, radio, email, file].length).toBe(4);
	});
});
