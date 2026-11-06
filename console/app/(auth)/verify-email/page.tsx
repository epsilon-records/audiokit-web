import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = { title: "Check your inbox" };

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Check your inbox"
      subtitle="We sent a confirmation link to you@example.com."
      footer={
        <Link href="/console" className="link">
          Continue to the console
        </Link>
      }
    >
      <div className="form-actions">
        <button type="button" className="btn btn-primary">
          Resend confirmation
        </button>
        <Link href="/console/settings/profile" className="btn btn-ghost">
          Change email
        </Link>
      </div>
      {/* TODO(EPSILON-46): sent / resent (cooldown) / verified / expired-link
          states, and the persistent banner while unverified. */}
    </AuthCard>
  );
}
