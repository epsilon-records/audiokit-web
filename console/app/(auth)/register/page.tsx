import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your AudioKit account"
      subtitle="Start on the Free plan — 100 jobs/month, no card."
      footer={
        <span>
          Already have an account? <Link href="/login">Sign in</Link>
        </span>
      }
    >
      <AuthForm submitLabel="Create account">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete="new-password"
            aria-describedby="password-hint"
            required
          />
          <p className="hint" id="password-hint">
            At least 12 characters. A length rule only — MFA is out of scope for the MVP.
          </p>
        </div>
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span>
            I agree to the terms. {/* TODO(EPSILON-46): link terms/privacy once those pages exist. */}
          </span>
        </label>
        {/* TODO(EPSILON-46): email-taken, weak-password and rate-limit states. */}
      </AuthForm>
    </AuthCard>
  );
}
