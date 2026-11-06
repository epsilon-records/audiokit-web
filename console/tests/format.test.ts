import { describe, expect, it } from 'vitest';
import {
	formatDate,
	formatNumber,
	formatPercent,
	formatShortDate,
	formatTime,
	percent,
	relativeTime
} from '../src/lib/format';

describe('percent', () => {
	it('clamps to a 0–100 range', () => {
		expect(percent(50, 100)).toBe(50);
		expect(percent(150, 100)).toBe(100);
		expect(percent(-5, 100)).toBe(0);
	});

	it('treats a zero or negative limit as empty', () => {
		expect(percent(10, 0)).toBe(0);
		expect(percent(10, -1)).toBe(0);
	});
});

describe('formatting', () => {
	it('formats dates in UTC', () => {
		expect(formatDate('2026-12-01T00:00:00.000Z')).toBe('1 Dec 2026');
		expect(formatShortDate('2026-11-14T23:30:00.000Z')).toBe('14 Nov');
		expect(formatTime('2026-11-14T12:01:00.000Z')).toBe('12:01');
	});

	it('formats numbers and percentages', () => {
		expect(formatNumber(10000)).toBe('10,000');
		expect(formatPercent(41.4)).toBe('41%');
	});
});

describe('relativeTime', () => {
	const now = new Date('2026-11-14T12:00:00.000Z');

	it('handles never', () => {
		expect(relativeTime(null, now)).toBe('never');
	});

	it('is coarse and human-readable', () => {
		expect(relativeTime('2026-11-14T11:59:40.000Z', now)).toBe('just now');
		expect(relativeTime('2026-11-14T11:30:00.000Z', now)).toBe('30 min ago');
		expect(relativeTime('2026-11-14T09:00:00.000Z', now)).toBe('3 h ago');
		expect(relativeTime('2026-11-13T12:00:00.000Z', now)).toBe('1 day ago');
		expect(relativeTime('2026-11-12T12:00:00.000Z', now)).toBe('2 days ago');
	});

	it('falls back to an absolute date beyond a month', () => {
		expect(relativeTime('2026-09-01T00:00:00.000Z', now)).toBe('1 Sept 2026');
	});
});
