-- AudioKit Backend Database Schema
-- PostgreSQL 14+
-- Supports freemium pricing model with usage tracking and subscription management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  name VARCHAR(255),
  company VARCHAR(255),

  -- Email verification
  email_verified_at TIMESTAMP,
  email_verification_token VARCHAR(64),
  email_verification_expires_at TIMESTAMP,

  -- Password reset
  password_reset_token VARCHAR(64),
  password_reset_expires_at TIMESTAMP,

  -- Account status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,

  -- Indexes
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- ============================================================================
-- SUBSCRIPTIONS & BILLING
-- ============================================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Tier and status
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',

  -- Billing cycle
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,

  -- Stripe integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- Trial
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one active subscription per user
  CONSTRAINT one_active_subscription_per_user UNIQUE (user_id) WHERE (status = 'active')
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- ============================================================================
-- SUBSCRIPTION PLANS (configuration)
-- ============================================================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier subscription_tier UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly_cents INTEGER NOT NULL,
  price_yearly_cents INTEGER,

  -- Quotas
  monthly_job_quota INTEGER NOT NULL,
  overage_price_cents INTEGER, -- price per job over quota

  -- Features
  priority_processing BOOLEAN DEFAULT FALSE,
  email_support BOOLEAN DEFAULT FALSE,
  sla_uptime_percentage DECIMAL(5,2),

  -- Stripe integration
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (tier, name, description, price_monthly_cents, monthly_job_quota, overage_price_cents, priority_processing, email_support, sla_uptime_percentage) VALUES
('free', 'Free', 'Perfect for testing and small projects', 0, 100, NULL, FALSE, FALSE, NULL),
('pro', 'Pro', 'For growing businesses and production use', 9900, 10000, 1, TRUE, TRUE, 99.9),
('enterprise', 'Enterprise', 'Custom solutions for large-scale operations', 0, -1, NULL, TRUE, TRUE, 99.99);

-- ============================================================================
-- API KEYS
-- ============================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Key details
  name VARCHAR(100), -- user-provided name for the key
  key_prefix VARCHAR(10) NOT NULL, -- e.g., "ak_abc123" (first 10 chars for display)
  key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash of full key

  -- Permissions & tier
  tier subscription_tier NOT NULL DEFAULT 'free',
  scopes TEXT[], -- future: array of permission scopes

  -- Usage tracking
  last_used_at TIMESTAMP,
  last_used_ip INET,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,

  -- Expiration (optional)
  expires_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at);

-- ============================================================================
-- JOBS (persisted job records)
-- ============================================================================

CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Job identifiers
  provider_job_id UUID NOT NULL UNIQUE, -- internal UUID
  client_job_id VARCHAR(200) NOT NULL, -- client-provided idempotency key

  -- Job details
  operation VARCHAR(50) NOT NULL, -- analyze, transcode, etc.
  status job_status NOT NULL DEFAULT 'queued',

  -- Input/output
  input_url TEXT NOT NULL,
  input_sha256 VARCHAR(64),
  output_data JSONB, -- results

  -- Webhook
  webhook_url TEXT,
  webhook_delivered_at TIMESTAMP,
  webhook_attempts INTEGER DEFAULT 0,

  -- Timing
  queued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,

  -- Billing
  tier subscription_tier NOT NULL, -- tier at time of job submission
  counted_in_quota BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure idempotency per user
  CONSTRAINT unique_client_job_id_per_user UNIQUE (user_id, client_job_id)
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_api_key_id ON jobs(api_key_id);
CREATE INDEX idx_jobs_provider_job_id ON jobs(provider_job_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_operation ON jobs(operation);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_tier ON jobs(tier);

-- ============================================================================
-- USAGE RECORDS (aggregated usage per billing period)
-- ============================================================================

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Usage counts
  job_count INTEGER NOT NULL DEFAULT 0,
  job_count_by_operation JSONB, -- {"analyze": 50, "transcode": 30}

  -- Quota and overage
  quota_limit INTEGER NOT NULL,
  overage_count INTEGER GENERATED ALWAYS AS (GREATEST(0, job_count - quota_limit)) STORED,

  -- Billing
  overage_charge_cents INTEGER,
  stripe_invoice_id VARCHAR(255),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- One record per user per period
  CONSTRAINT unique_usage_record_per_period UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_period ON usage_records(period_start, period_end);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Stripe
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_invoice_url TEXT,

  -- Amounts
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Status
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Payment
  paid_at TIMESTAMP,
  due_date TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,

  -- Card details (for display only)
  card_brand VARCHAR(20), -- visa, mastercard, amex
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Status
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_stripe_payment_method_id ON payment_methods(stripe_payment_method_id);

-- Ensure only one default payment method per user
CREATE UNIQUE INDEX idx_payment_methods_default_per_user ON payment_methods(user_id) WHERE is_default = TRUE;

-- ============================================================================
-- WEBHOOK EVENTS (for audit/debugging)
-- ============================================================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Stripe event
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- customer.subscription.updated, etc.

  -- Data
  payload JSONB NOT NULL,

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Action
  action VARCHAR(100) NOT NULL, -- user.created, subscription.upgraded, api_key.revoked
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Details
  metadata JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_records_updated_at BEFORE UPDATE ON usage_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS (convenient queries)
-- ============================================================================

-- Current subscription view
CREATE VIEW current_subscriptions AS
SELECT
  u.id AS user_id,
  u.email,
  s.tier,
  s.status,
  s.current_period_start,
  s.current_period_end,
  sp.monthly_job_quota,
  sp.priority_processing,
  s.stripe_customer_id,
  s.stripe_subscription_id
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.tier = sp.tier;

-- Current period usage view
CREATE VIEW current_period_usage AS
SELECT
  ur.user_id,
  ur.period_start,
  ur.period_end,
  ur.job_count,
  ur.quota_limit,
  ur.overage_count,
  ROUND((ur.job_count::NUMERIC / NULLIF(ur.quota_limit, 0)) * 100, 2) AS quota_used_percentage
FROM usage_records ur
WHERE ur.period_end > NOW();

-- ============================================================================
-- COMMENTS (documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE subscriptions IS 'User subscriptions and billing cycles';
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers and their quotas';
COMMENT ON TABLE api_keys IS 'API keys for authentication (stores SHA256 hash only)';
COMMENT ON TABLE jobs IS 'Persisted job records for usage tracking and billing';
COMMENT ON TABLE usage_records IS 'Aggregated usage per billing period';
COMMENT ON TABLE invoices IS 'Generated invoices for subscriptions and overages';
COMMENT ON TABLE payment_methods IS 'Stored payment methods (via Stripe)';
COMMENT ON TABLE webhook_events IS 'Stripe webhook events for audit trail';
COMMENT ON TABLE audit_logs IS 'Audit log for all significant actions';
