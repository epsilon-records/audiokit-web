// User accounts, authentication and API-key lookup.
import db from '../db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
} from '../utils/crypto.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  company: string | null;
  status: string;
  email_verified_at: string | null;
  email_verification_token: string | null;
  email_verification_expires_at: string | null;
  password_reset_token: string | null;
  password_reset_expires_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<
  UserRow,
  'password_hash' | 'email_verification_token' | 'password_reset_token'
>;

export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  [key: string]: unknown;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  tier: string;
  is_active: boolean;
  expires_at: string | null;
  [key: string]: unknown;
}

export interface AuthContext {
  apiKey: ApiKeyRow;
  user: PublicUser;
  subscription: SubscriptionRow;
}

export interface RegisterResult {
  user: PublicUser;
  subscription: SubscriptionRow;
  apiKey: string;
  verificationToken: string;
}

const FREE_TIER_MONTHLY_QUOTA = 100;

export class AuthService {
  /** Register a user with a free subscription, an API key and a usage record. */
  static async register(input: {
    email: string;
    password: string;
    name?: string;
    company?: string;
  }): Promise<RegisterResult> {
    const email = input.email.toLowerCase().trim();

    const existing = await db.findOne('users', { email });
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const emailVerificationToken = generateToken();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user: UserRow = await db.insertOne('users', {
      email,
      password_hash: passwordHash,
      name: input.name ?? null,
      company: input.company ?? null,
      email_verification_token: emailVerificationToken,
      email_verification_expires_at: emailVerificationExpiresAt,
      status: 'active',
    });

    const subscription: SubscriptionRow = await db.insertOne('subscriptions', {
      user_id: user.id,
      tier: 'free',
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const apiKey = generateApiKey();
    await db.insertOne('api_keys', {
      user_id: user.id,
      name: 'Default',
      key_prefix: getApiKeyPrefix(apiKey),
      key_hash: hashApiKey(apiKey),
      tier: 'free',
      is_active: true,
    });

    await db.insertOne('usage_records', {
      user_id: user.id,
      subscription_id: subscription.id,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
      job_count: 0,
      quota_limit: FREE_TIER_MONTHLY_QUOTA,
    });

    return {
      user: this.sanitizeUser(user),
      subscription,
      apiKey,
      verificationToken: emailVerificationToken,
    };
  }

  static async login(input: { email: string; password: string }): Promise<PublicUser> {
    const email = input.email.toLowerCase().trim();

    const user: UserRow | null = await db.findOne('users', { email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await comparePassword(input.password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    await db.updateOne('users', { id: user.id }, { last_login_at: new Date() });

    return this.sanitizeUser(user);
  }

  static async verifyEmail(token: string): Promise<PublicUser> {
    const user: UserRow | null = await db.findOne('users', { email_verification_token: token });
    if (!user) {
      throw new Error('Invalid verification token');
    }
    if (
      user.email_verification_expires_at &&
      new Date() > new Date(user.email_verification_expires_at)
    ) {
      throw new Error('Verification token expired');
    }

    await db.updateOne(
      'users',
      { id: user.id },
      {
        email_verified_at: new Date(),
        email_verification_token: null,
        email_verification_expires_at: null,
      },
    );

    return this.sanitizeUser(user);
  }

  /**
   * Create a password-reset token. The token is returned to the caller so the
   * (not-yet-built) email layer can send it; it is never returned over HTTP.
   */
  static async requestPasswordReset(email: string): Promise<{ success: true; resetToken?: string }> {
    const normalized = email.toLowerCase().trim();

    const user: UserRow | null = await db.findOne('users', { email: normalized });
    if (!user) {
      // Do not reveal whether the address exists.
      return { success: true };
    }

    const resetToken = generateToken();
    await db.updateOne(
      'users',
      { id: user.id },
      {
        password_reset_token: resetToken,
        password_reset_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    );

    return { success: true, resetToken };
  }

  static async resetPassword(token: string, newPassword: string): Promise<PublicUser> {
    const user: UserRow | null = await db.findOne('users', { password_reset_token: token });
    if (!user) {
      throw new Error('Invalid reset token');
    }
    if (user.password_reset_expires_at && new Date() > new Date(user.password_reset_expires_at)) {
      throw new Error('Reset token expired');
    }

    const passwordHash = await hashPassword(newPassword);
    await db.updateOne(
      'users',
      { id: user.id },
      {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires_at: null,
      },
    );

    return this.sanitizeUser(user);
  }

  /** Resolve an API key to its user and active subscription, or null. */
  static async authenticateApiKey(key: string): Promise<AuthContext | null> {
    const apiKey: ApiKeyRow | null = await db.findOne('api_keys', { key_hash: hashApiKey(key) });
    if (!apiKey || !apiKey.is_active) {
      return null;
    }
    if (apiKey.expires_at && new Date() > new Date(apiKey.expires_at)) {
      return null;
    }

    await db.updateOne('api_keys', { id: apiKey.id }, { last_used_at: new Date() });

    const user: UserRow | null = await db.findOne('users', { id: apiKey.user_id });
    if (!user) {
      return null;
    }

    const subscription: SubscriptionRow | null = await db.findOne('subscriptions', {
      user_id: user.id,
      status: 'active',
    });
    if (!subscription) {
      return null;
    }

    return { apiKey, user: this.sanitizeUser(user), subscription };
  }

  /** Strip secrets before a user row leaves the service. */
  static sanitizeUser(user: UserRow): PublicUser {
    const {
      password_hash: _passwordHash,
      email_verification_token: _emailVerificationToken,
      password_reset_token: _passwordResetToken,
      ...safe
    } = user;
    return safe;
  }
}

export default AuthService;
