/**
 * Types for the console's view of the billing/accounts service.
 *
 * These mirror the information the design says each screen needs
 * (docs/console/information-architecture.md §7), not the service's wire format.
 * The service is a separate Node/TS service in this repo (knowledge decision
 * 0014); its API is not settled yet, so `lib/api-client.ts` is the only place
 * that should know how these are fetched.
 */

export type PlanId = "free" | "pro" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number | null;
  priceLabel: string;
  jobLimit: number | null;
  features: string[];
  /** One line describing what this plan adds over the current one. */
  delta?: string;
  featured?: boolean;
};

export type Account = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  plan: PlanId;
  /** ISO date the current period resets. */
  renewsAt: string;
  /** Set when a payment has failed; drives the past-due banner and badge. */
  pastDue?: boolean;
  /** Set when a downgrade is scheduled for the end of the period. */
  cancelsAt?: string;
};

export type JobStatus = "succeeded" | "running" | "queued" | "failed";

export type Job = {
  id: string;
  operation: string;
  status: JobStatus;
  createdAt: string;
};

export type UsageSummary = {
  periodStart: string;
  periodEnd: string;
  jobsUsed: number;
  jobLimit: number;
  /** Jobs per day for the current period. */
  daily: { date: string; jobs: number }[];
  byOperation: { operation: string; jobs: number }[];
  history: {
    period: string;
    jobs: number;
    limit: number;
    status: "within quota" | "quota reached" | "overage";
  }[];
};

export type ApiKey = {
  id: string;
  label: string;
  /** Only the prefix is ever shown after creation. */
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
};

export type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "open" | "past due";
  url: string;
};

export type NotificationPreferences = {
  quotaWarnings: boolean;
  paymentReceipts: boolean;
  productUpdates: boolean;
};

export type BillingSummary = {
  plan: PlanId;
  renewsAt: string;
  paymentMethod: string | null;
  invoices: Invoice[];
  portalUrl: string | null;
};

export type CheckoutResult = {
  status: "success" | "processing" | "cancelled" | "failed";
  plan?: PlanId;
  renewsAt?: string;
};
