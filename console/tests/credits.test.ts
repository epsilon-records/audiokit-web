import { describe, expect, it } from 'vitest';
import { nextFreeCreditsRenewal, outOfCreditsNotice } from '../src/lib/credits';

const at = (iso: string) => new Date(iso);

describe('nextFreeCreditsRenewal', () => {
	it('is the first of the next calendar month, UTC', () => {
		expect(nextFreeCreditsRenewal(at('2026-11-14T12:00:00.000Z')).toISOString()).toBe(
			'2026-12-01T00:00:00.000Z'
		);
	});

	it('rolls December over to January of the next year', () => {
		expect(nextFreeCreditsRenewal(at('2026-12-31T23:59:59.999Z')).toISOString()).toBe(
			'2027-01-01T00:00:00.000Z'
		);
	});

	it('moves on at the instant a month starts, not before', () => {
		expect(nextFreeCreditsRenewal(at('2026-11-30T23:59:59.999Z')).toISOString()).toBe(
			'2026-12-01T00:00:00.000Z'
		);
		expect(nextFreeCreditsRenewal(at('2026-12-01T00:00:00.000Z')).toISOString()).toBe(
			'2027-01-01T00:00:00.000Z'
		);
	});

	it('reads the UTC month, whatever the local zone', () => {
		// 00:30 on 1 December in UTC+2 is still 30 November in UTC.
		expect(nextFreeCreditsRenewal(at('2026-11-30T22:30:00.000Z')).toISOString()).toBe(
			'2026-12-01T00:00:00.000Z'
		);
	});

	it('handles February in a leap year', () => {
		expect(nextFreeCreditsRenewal(at('2028-02-29T10:00:00.000Z')).toISOString()).toBe(
			'2028-03-01T00:00:00.000Z'
		);
	});
});

describe('outOfCreditsNotice', () => {
	it('names the renewal date in day month year order', () => {
		expect(outOfCreditsNotice(at('2026-11-14T12:00:00.000Z'))).toBe(
			'New jobs are refused until your free credits renew on 1 December 2026 (UTC).'
		);
		expect(outOfCreditsNotice(at('2026-12-20T08:00:00.000Z'))).toBe(
			'New jobs are refused until your free credits renew on 1 January 2027 (UTC).'
		);
	});

	it('mentions no top-up, pack or purchase (packs are not on sale, 0066)', () => {
		expect(outOfCreditsNotice(at('2026-11-14T12:00:00.000Z'))).not.toMatch(
			/top.?up|pack|buy|purchase/i
		);
	});
});
