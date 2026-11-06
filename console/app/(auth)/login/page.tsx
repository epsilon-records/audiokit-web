import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in to your console"
      subtitle="Manage usage, API keys and your plan."
      footer={
        <>
          <span>
            New to AudioKit? <Link href="/register">Create an account</Link>
          </span>
          <a href="https://audiokit.ai/docs/" target="_blank" rel="noopener noreferrer">
            Read the docs ↗
          </a>
        </>
      }
    >
      <AuthForm submitLabel="Sign in">
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
            autoComplete="current-password"
            required
          />
          <p className="hint" style={{ textAlign: "right" }}>
            <Link href="/forgot-password" className="link">
              Forgot password?
            </Link>
          </p>
        </div>
        {/* TODO(EPSILON-46): generic error region for wrong credentials,
            unverified email, rate limiting and service errors. */}
      </AuthForm>
    </AuthCard>
  );
}
