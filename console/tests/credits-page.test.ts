// EPSILON-169 PR 3: the words the credits page and the shell banner use (AudioKit 0052, 0066,
// 0074, 0077).
import { describe, expect, it } from 'vitest';
import {
	balanceBanner,
	CREDIT_PACKS,
	entryKindLabel,
	lotExpiry,
	lotSourceLabel,
	lowBalanceDetail,
	lowBalanceLabel,
	packPrice,
	signedCredits
} from '../src/lib/credits';
import type { LowBalance } from '../src/lib/types';

const low = (
	state: LowBalance['state'],
	since: string | null = '2026-11-15T08:00:00Z'
): LowBalance => ({
	state,
	threshold: 20,
	since,
	emailsEnabled: false,
	emailsOptedIn: true
});

describe('credit packs', () => {
	it("are decision 0052's three packs, named as billing names them", () => {
		expect(CREDIT_PACKS.map((p) => [p.pack, p.credits, packPrice(p.priceCents)])).toEqual([
			['credits_1000', 1000, '$10'],
			['credits_5500', 5500, '$50'],
			['credits_24000', 24000, '$200']
		]);
	});
});

describe('lots', () => {
	it('names each source', () => {
		expect(lotSourceLabel('free_monthly')).toBe('Free monthly');
		expect(lotSourceLabel('purchase')).toBe('Purchased');
		expect(lotSourceLabel('grant')).toBe('Granted');
	});

	it('says a Free lot lapses, a purchase never expires, and keeps a date billing still sends', () => {
		expect(lotExpiry({ source: 'free_monthly', expiresAt: '2026-12-01T00:00:00Z' })).toBe(
			'Lapses 1 December 2026 (UTC)'
		);
		expect(lotExpiry({ source: 'purchase', expiresAt: null })).toBe('Never expires');
		// Before epsilon-billing#79 deploys, a purchased lot still carries a date.
		expect(lotExpiry({ source: 'purchase', expiresAt: '2027-11-14T09:00:00Z' })).toBe(
			'Expires 14 November 2027 (UTC)'
		);
	});
});

describe('movements', () => {
	it('names each kind and signs the amount', () => {
		expect(
			['credit', 'debit', 'release', 'expiry', 'repay'].map((k) => entryKindLabel(k as never))
		).toEqual(['Added', 'Spent', 'Returned', 'Lapsed', 'Repaid']);
		expect([signedCredits(100), signedCredits(-2), signedCredits(0)]).toEqual(['+100', '−2', '0']);
	});
});

describe('low balance', () => {
	it('labels the three states with the threshold', () => {
		expect(lowBalanceLabel('ok')).toBe('OK');
		expect(lowBalanceLabel('low')).toBe('Low');
		expect(lowBalanceLabel('empty')).toBe('Empty');
		expect(lowBalanceDetail(low('ok', null))).toBe('At or above 20 credits.');
		expect(lowBalanceDetail(low('low'))).toBe('Below 20 credits since 15 Nov.');
		expect(lowBalanceDetail(low('empty'))).toBe('No credits left since 15 Nov.');
	});

	it('never promises an email', () => {
		for (const state of ['ok', 'low', 'empty'] as const) {
			expect(lowBalanceDetail(low(state))).not.toMatch(/email/i);
		}
	});

	it('shows the banner on low and empty when billing sends the state', () => {
		expect(balanceBanner({ balance: 30, lowBalance: low('ok', null) })).toBeNull();
		expect(balanceBanner({ balance: 12, lowBalance: low('low') })).toBe('low');
		expect(balanceBanner({ balance: 0, lowBalance: low('empty') })).toBe('empty');
	});

	it('warns only at zero without it, as before', () => {
		expect(balanceBanner({ balance: 12 })).toBeNull();
		expect(balanceBanner({ balance: 0 })).toBe('empty');
		expect(balanceBanner(null)).toBeNull();
	});
});
