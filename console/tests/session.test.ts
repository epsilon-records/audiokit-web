import { describe, expect, it } from 'vitest';
import { DEFAULT_AFTER_LOGIN, safeNext } from '../src/lib/session';

describe('safeNext', () => {
	it('allows absolute same-origin paths', () => {
		expect(safeNext('/usage')).toBe('/usage');
		expect(safeNext('/settings/billing?tab=invoices')).toBe('/settings/billing?tab=invoices');
	});

	it('falls back to the dashboard for anything else', () => {
		expect(safeNext(null)).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeNext(undefined)).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeNext('')).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeNext('https://evil.example/steal')).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeNext('//evil.example/steal')).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeNext('/\\evil.example/steal')).toBe(DEFAULT_AFTER_LOGIN);
		expect(safeNext('usage')).toBe(DEFAULT_AFTER_LOGIN);
	});
});
