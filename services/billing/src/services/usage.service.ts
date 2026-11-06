// Usage tracking and quota enforcement.
import db, { query } from '../db.js';

export interface PlanRow {
  tier: string;
  monthly_job_quota: number;
  overage_price_cents: number | null;
  [key: string]: unknown;
}

export interface QuotaResult {
  allowed: boolean;
  tier: string;
  usage: number;
  limit: number | null;
  remaining: number | null;
  isOverage: boolean;
  overageCount?: number;
  message?: string;
}

export interface CurrentUsage {
  tier: string;
  jobCount: number;
  jobCountByOperation: Record<string, number>;
  quotaLimit: number;
  overageCount: number;
  periodStart: string;
  periodEnd: string;
}

const UNLIMITED_QUOTA = -1;

/**
 * Pure quota decision: given a tier's plan and the period's usage, decide
 * whether the next job is allowed and how it counts. Kept separate from the
 * database so it can be unit-tested.
 */
export function evaluateQuota(
  tier: string,
  monthlyJobQuota: number,
  currentUsage: number,
): QuotaResult {
  if (monthlyJobQuota === UNLIMITED_QUOTA) {
    return {
      allowed: true,
      tier,
      usage: currentUsage,
      limit: null,
      remaining: null,
      isOverage: false,
    };
  }

  const isOverQuota = currentUsage >= monthlyJobQuota;

  // Free tier is a hard limit: no overages, reject once the quota is reached.
  if (tier === 'free' && isOverQuota) {
    return {
      allowed: false,
      tier,
      usage: currentUsage,
      limit: monthlyJobQuota,
      remaining: 0,
      isOverage: true,
      message: 'Free tier quota exceeded. Please upgrade to Pro to continue processing.',
    };
  }

  // Paid tiers may go over quota; the overage is tracked for billing.
  return {
    allowed: true,
    tier,
    usage: currentUsage,
    limit: monthlyJobQuota,
    remaining: Math.max(0, monthlyJobQuota - currentUsage),
    isOverage: isOverQuota,
    overageCount: Math.max(0, currentUsage - monthlyJobQuota),
  };
}

export class UsageService {
  /** Check whether a user may submit another job this period. */
  static async checkQuota(userId: string): Promise<QuotaResult> {
    const subscription = await db.findOne('subscriptions', { user_id: userId, status: 'active' });
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const plan: PlanRow | null = await db.findOne('subscription_plans', { tier: subscription.tier });
    if (!plan) {
      throw new Error(`No subscription plan configured for tier: ${subscription.tier}`);
    }

    const usageRecord = await db.findOne('usage_records', {
      user_id: userId,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
    });

    const currentUsage = usageRecord ? usageRecord.job_count : 0;
    return evaluateQuota(subscription.tier, plan.monthly_job_quota, currentUsage);
  }

  /** Increment the period's usage counter, creating the record if needed. */
  static async recordJob(userId: string, operation: string): Promise<any> {
    const subscription = await db.findOne('subscriptions', { user_id: userId, status: 'active' });
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    let usageRecord = await db.findOne('usage_records', {
      user_id: userId,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
    });

    if (!usageRecord) {
      const plan: PlanRow | null = await db.findOne('subscription_plans', { tier: subscription.tier });
      usageRecord = await db.insertOne('usage_records', {
        user_id: userId,
        subscription_id: subscription.id,
        period_start: subscription.current_period_start,
        period_end: subscription.current_period_end,
        job_count: 0,
        quota_limit: plan?.monthly_job_quota ?? 0,
        job_count_by_operation: {},
      });
    }

    const result = await query(
      `UPDATE usage_records
       SET
         job_count = job_count + 1,
         job_count_by_operation = COALESCE(job_count_by_operation, '{}'::jsonb) ||
           jsonb_build_object($1, COALESCE((job_count_by_operation->>$1)::int, 0) + 1),
         updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [operation, usageRecord.id],
    );

    return result.rows[0];
  }

  static async getCurrentUsage(userId: string): Promise<CurrentUsage | null> {
    const subscription = await db.findOne('subscriptions', { user_id: userId, status: 'active' });
    if (!subscription) {
      return null;
    }

    const usageRecord = await db.findOne('usage_records', {
      user_id: userId,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
    });

    const plan: PlanRow | null = await db.findOne('subscription_plans', { tier: subscription.tier });
    const quotaLimit = plan?.monthly_job_quota ?? 0;

    return {
      tier: subscription.tier,
      jobCount: usageRecord ? usageRecord.job_count : 0,
      jobCountByOperation: usageRecord?.job_count_by_operation ?? {},
      quotaLimit,
      overageCount: usageRecord ? Math.max(0, usageRecord.job_count - quotaLimit) : 0,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
    };
  }

  static async getUsageHistory(userId: string, limit = 12): Promise<any[]> {
    const records = await query(
      `SELECT * FROM usage_records WHERE user_id = $1 ORDER BY period_start DESC LIMIT $2`,
      [userId, limit],
    );
    return records.rows;
  }

  /** Open a usage record for a new billing period (period rollover). */
  static async resetUsageForNewPeriod(
    userId: string,
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
    quotaLimit: number,
  ): Promise<any> {
    return db.insertOne('usage_records', {
      user_id: userId,
      subscription_id: subscriptionId,
      period_start: periodStart,
      period_end: periodEnd,
      job_count: 0,
      quota_limit: quotaLimit,
      job_count_by_operation: {},
    });
  }

  /** Overage charge for the current period, if the tier allows overages. */
  static async calculateOverageCharges(userId: string): Promise<{
    hasOverage: boolean;
    overageCount: number;
    pricePerJobCents?: number;
    chargeCents: number;
  }> {
    const usage = await this.getCurrentUsage(userId);
    if (!usage || usage.overageCount === 0) {
      return { hasOverage: false, overageCount: 0, chargeCents: 0 };
    }

    const subscription = await db.findOne('subscriptions', { user_id: userId, status: 'active' });
    if (!subscription) {
      return { hasOverage: false, overageCount: 0, chargeCents: 0 };
    }

    const plan: PlanRow | null = await db.findOne('subscription_plans', { tier: subscription.tier });
    if (!plan?.overage_price_cents) {
      return { hasOverage: false, overageCount: 0, chargeCents: 0 };
    }

    return {
      hasOverage: true,
      overageCount: usage.overageCount,
      pricePerJobCents: plan.overage_price_cents,
      chargeCents: usage.overageCount * plan.overage_price_cents,
    };
  }
}

export default UsageService;
