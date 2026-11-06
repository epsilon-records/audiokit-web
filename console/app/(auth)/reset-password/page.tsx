import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Your reset link is valid for a short time."
      footer={
        <Link href="/login" className="link">
          ← Back to sign in
        </Link>
      }
    >
      <AuthForm submitLabel="Update password">
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            required
          />
        </div>
        {/* TODO(EPSILON-46): expired/used token state with a "send a new link"
            action, mismatch and weak-password validation. */}
      </AuthForm>
    </AuthCard>
  );
}
