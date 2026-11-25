import { describe, expect, it } from 'vitest';
import { createMockAdapter } from '../src/lib/mock-adapter';
import type { NotificationPreferences } from '../src/lib/types';

// #105: the mock stores preference updates the way billing does, merging them into what it has.
describe('mock adapter: notification preferences', () => {
	it('keeps a stored field that an update leaves out', async () => {
		const api = createMockAdapter();
		const before = await api.getNotificationPreferences();
		expect(before.lowBalanceAlerts).toBeDefined();

		const { lowBalanceAlerts: _omitted, ...withoutLowBalance } = before;
		const saved = await api.updateNotificationPreferences({
			...withoutLowBalance,
			productUpdates: !before.productUpdates
		} as NotificationPreferences);

		expect(saved.lowBalanceAlerts).toBe(before.lowBalanceAlerts);
		expect(saved.productUpdates).toBe(!before.productUpdates);
		expect((await api.getNotificationPreferences()).lowBalanceAlerts).toBe(before.lowBalanceAlerts);
	});

	it('applies an explicit true and an explicit false', async () => {
		const api = createMockAdapter();
		const before = await api.getNotificationPreferences();

		const off = await api.updateNotificationPreferences({ ...before, lowBalanceAlerts: false });
		expect(off.lowBalanceAlerts).toBe(false);
		const on = await api.updateNotificationPreferences({ ...off, lowBalanceAlerts: true });
		expect(on.lowBalanceAlerts).toBe(true);
	});
});
