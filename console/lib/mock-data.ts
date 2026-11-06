/**
 * Static mock data for the console scaffold.
 *
 * Nothing here talks to a backend. The shapes match `lib/types.ts`, so replacing
 * these exports with calls to `lib/api-client.ts` is the only change needed when
 * the billing/accounts service lands. Values are generic and deterministic so
 * the build is reproducible.
 */

import type {
  Account,
  ApiKey,
  BillingSummary,
  Job,
  NotificationPreferences,
  Plan,
  UsageSummary,
} from "./types";

export const account: Account = {
  id: "acct_mock_0001",
  name: "Example User",
  email: "you@example.com",
  emailVerified: true,
  plan: "free",
  renewsAt: "2026-12-01T00:00:00.000Z",
};

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceLabel: "$0",
    jobLimit: 100,
    features: [
      "100 jobs per month",
      "All analysis operations",
      "All processing operations",
      "Webhook delivery",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 99,
    priceLabel: "$99",
    jobLimit: 10_000,
    features: [
      "10,000 jobs per month",
      "Priority processing",
      "Overage at $0.01 per job",
      "Email support",
    ],
    delta: "Adds 9,900 jobs per month",
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    priceLabel: "Custom",
    jobLimit: null,
    features: [
      "Custom job volume",
      "Priority processing",
      "Dedicated support",
      "Custom terms",
    ],
    delta: "Talk to us about volume and support",
  },
];

export const recentJobs: Job[] = [
  { id: "a1b2c3d4", operation: "analyze", status: "succeeded", createdAt: "2026-11-06T12:01:00.000Z" },
  { id: "e5f6a7b8", operation: "transcode", status: "running", createdAt: "2026-11-06T11:58:00.000Z" },
  { id: "c9d0e1f2", operation: "tags", status: "failed", createdAt: "2026-11-06T11:40:00.000Z" },
  { id: "f3a4b5c6", operation: "loudness", status: "succeeded", createdAt: "2026-11-06T10:22:00.000Z" },
  { id: "d7e8f9a0", operation: "probe", status: "succeeded", createdAt: "2026-11-06T09:15:00.000Z" },
];

const daily = [
  { date: "2026-11-01", jobs: 12 },
  { date: "2026-11-02", jobs: 18 },
  { date: "2026-11-03", jobs: 9 },
  { date: "2026-11-04", jobs: 24 },
  { date: "2026-11-05", jobs: 31 },
  { date: "2026-11-06", jobs: 6 },
];

const byOperation = [
  { operation: "analyze", jobs: 48 },
  { operation: "transcode", jobs: 24 },
  { operation: "tags", jobs: 15 },
  { operation: "loudness", jobs: 9 },
  { operation: "other", jobs: 4 },
];

const history = [
  { period: "Nov 2026", jobs: 100, limit: 100, status: "quota reached" as const },
  { period: "Oct 2026", jobs: 87, limit: 100, status: "within quota" as const },
  { period: "Sep 2026", jobs: 64, limit: 100, status: "within quota" as const },
  { period: "Aug 2026", jobs: 41, limit: 100, status: "within quota" as const },
  { period: "Jul 2026", jobs: 22, limit: 100, status: "within quota" as const },
  { period: "Jun 2026", jobs: 8, limit: 100, status: "within quota" as const },
  { period: "May 2026", jobs: 0, limit: 100, status: "within quota" as const },
  { period: "Apr 2026", jobs: 0, limit: 100, status: "within quota" as const },
  { period: "Mar 2026", jobs: 0, limit: 100, status: "within quota" as const },
  { period: "Feb 2026", jobs: 0, limit: 100, status: "within quota" as const },
  { period: "Jan 2026", jobs: 0, limit: 100, status: "within quota" as const },
  { period: "Dec 2025", jobs: 0, limit: 100, status: "within quota" as const },
];

export const usage: UsageSummary = {
  periodStart: "2026-11-01T00:00:00.000Z",
  periodEnd: "2026-11-30T23:59:59.000Z",
  jobsUsed: 100,
  jobLimit: 100,
  daily,
  byOperation,
  history,
};

export const apiKeys: ApiKey[] = [
  {
    id: "key_0001",
    label: "production",
    prefix: "ak_live_…4f2",
    createdAt: "2026-11-01T09:00:00.000Z",
    lastUsedAt: "2026-11-06T12:01:00.000Z",
    revoked: false,
  },
  {
    id: "key_0002",
    label: "laptop",
    prefix: "ak_live_…9c1",
    createdAt: "2026-11-03T14:30:00.000Z",
    lastUsedAt: "2026-11-04T18:20:00.000Z",
    revoked: false,
  },
  {
    id: "key_0003",
    label: "ci",
    prefix: "ak_live_…77a",
    createdAt: "2026-10-28T08:10:00.000Z",
    lastUsedAt: null,
    revoked: true,
  },
];

export const billing: BillingSummary = {
  plan: "free",
  renewsAt: "2026-12-01T00:00:00.000Z",
  paymentMethod: null,
  invoices: [],
  portalUrl: null,
};

export const notificationPreferences: NotificationPreferences = {
  quotaWarnings: true,
  paymentReceipts: true,
  productUpdates: false,
};

/** The API base URL shown in quick-start snippets. Mirrors site.config.mjs. */
export const apiBaseUrl = "https://api.audiokit.ai";
export const apiVersion = "0.1";
