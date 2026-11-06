import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <Link href="/login" className="link">
          ← Back to sign in
        </Link>
      }
    >
      <AuthForm
        submitLabel="Send reset link"
        note="If that address exists, we've sent a link. (Not connected yet — this is a scaffold.)"
      >
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
        {/* TODO(EPSILON-46): identical confirmation whether or not the account
            exists (no account enumeration), plus a rate-limit state. */}
      </AuthForm>
    </AuthCard>
  );
}
