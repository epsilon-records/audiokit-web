/**
 * Typed client stub for the billing/accounts service.
 *
 * The service is a separate Node/TS service in this repo (knowledge decision
 * 0014) and its HTTP API is not settled. This module is the boundary: screens
 * import these functions, never `fetch` directly. Today every function returns
 * static mock data; when the service lands, only this file changes.
 *
 * Deliberately no auth, cookies, CSRF or error handling yet — those are open
 * questions in docs/console/open-questions.md and should be decided before the
 * first real request is written.
 */

import * as mock from "./mock-data";
import type {
  Account,
  ApiKey,
  BillingSummary,
  CheckoutResult,
  Job,
  NotificationPreferences,
  Plan,
  UsageSummary,
} from "./types";

export type ConsoleClient = {
  getAccount(): Promise<Account>;
  getPlans(): Promise<Plan[]>;
  getRecentJobs(limit?: number): Promise<Job[]>;
  getUsage(): Promise<UsageSummary>;
  getApiKeys(): Promise<ApiKey[]>;
  getBilling(): Promise<BillingSummary>;
  getNotificationPreferences(): Promise<NotificationPreferences>;
  getCheckoutResult(): Promise<CheckoutResult>;
};

/**
 * The mock client. Swap this for an HTTP implementation once the service's
 * contract exists; keep the same `ConsoleClient` shape so screens don't change.
 */
export const client: ConsoleClient = {
  async getAccount() {
    return mock.account;
  },
  async getPlans() {
    return mock.plans;
  },
  async getRecentJobs(limit = 5) {
    return mock.recentJobs.slice(0, limit);
  },
  async getUsage() {
    return mock.usage;
  },
  async getApiKeys() {
    return mock.apiKeys;
  },
  async getBilling() {
    return mock.billing;
  },
  async getNotificationPreferences() {
    return mock.notificationPreferences;
  },
  async getCheckoutResult() {
    // TODO(EPSILON-46): read the checkout result from the service once the
    // Stripe return flow exists. Never claim Pro until the plan state confirms it.
    return { status: "success", plan: "pro", renewsAt: "2026-12-01T00:00:00.000Z" };
  },
};
