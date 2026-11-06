import Link from "next/link";
import { Alert } from "@/components/alert";
import { ConsoleShell } from "@/components/console-shell";
import { client } from "@/lib/api-client";
import { formatDate, formatNumber, percent } from "@/lib/format";
import { apiVersion } from "@/lib/mock-data";

/**
 * The signed-in frame. Banners live here so they are visible on every console
 * screen while they apply (docs/console/information-architecture.md §3).
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [account, usage, plans] = await Promise.all([
    client.getAccount(),
    client.getUsage(),
    client.getPlans(),
  ]);

  const plan = plans.find((item) => item.id === account.plan);
  const used = percent(usage.jobsUsed, usage.jobLimit);
  const atLimit = usage.jobsUsed >= usage.jobLimit;
  const nearLimit = !atLimit && used >= 80;

  const banners = (
    <>
      {!account.emailVerified ? (
        <Alert
          tone="info"
          actions={
            <>
              <Link href="/verify-email" className="btn btn-ghost btn-sm">
                Resend
              </Link>
              <a
                href="https://mail.example.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-quiet"
              >
                Open inbox ↗
              </a>
            </>
          }
        >
          Confirm your email to unlock API keys.
        </Alert>
      ) : null}

      {account.pastDue ? (
        <Alert
          tone="warn"
          actions={
            <Link href="/console/settings/billing" className="btn btn-ghost btn-sm">
              Update payment
            </Link>
          }
        >
          Payment failed. Update your card to keep {plan?.name ?? "your plan"} after{" "}
          {formatDate(account.renewsAt)}.
        </Alert>
      ) : null}

      {atLimit || nearLimit ? (
        <Alert
          tone={atLimit ? "warn" : "info"}
          actions={
            <Link href="/console/plan" className="btn btn-primary btn-sm">
              Upgrade to Pro
            </Link>
          }
        >
          {atLimit
            ? `You've used all ${formatNumber(usage.jobLimit)} of your ${plan?.name ?? ""} jobs this period. Job submission is paused until the period resets on ${formatDate(usage.periodEnd)}.`
            : `You've used ${formatNumber(usage.jobsUsed)} of your ${formatNumber(usage.jobLimit)} ${plan?.name ?? ""} jobs this period.`}
        </Alert>
      ) : null}
    </>
  );

  return (
    <ConsoleShell
      email={account.email}
      planName={plan?.name ?? "Free"}
      planWarn={account.pastDue}
      apiVersion={apiVersion}
      banners={banners}
    >
      {children}
    </ConsoleShell>
  );
}
