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

	it('falls back for a path a URL parser would read differently', () => {
		for (const value of [
			'/\t/evil.example',
			'/\n/evil.example',
			'/\r/evil.example',
			'/a\\b',
			'/a\u0000b'
		]) {
			expect(safeNext(value), JSON.stringify(value)).toBe(DEFAULT_AFTER_LOGIN);
		}
	});
});
