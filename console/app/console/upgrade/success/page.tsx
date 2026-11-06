import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/alert";
import { PageHeader } from "@/components/page-header";
import { client } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Upgrade complete" };

export default async function UpgradeSuccessPage() {
  const [result, plans] = await Promise.all([client.getCheckoutResult(), client.getPlans()]);
  const plan = plans.find((item) => item.id === result.plan);

  return (
    <>
      <PageHeader title="Upgrade" />
      {result.status === "processing" ? (
        <Alert tone="info" inline>
          Payment received — activating your plan. This usually takes a few seconds. You can safely
          leave.
        </Alert>
      ) : (
        <section className="panel">
          <div className="panel-body stack">
            <p className="kicker">✓ Confirmed</p>
            <h2 className="section-title">You&apos;re on {plan?.name ?? "Pro"}.</h2>
            <p className="dim">
              {plan?.jobLimit ? `${plan.jobLimit.toLocaleString("en-GB")} jobs/month` : "Custom volume"}
              {result.renewsAt ? `, renews ${formatDate(result.renewsAt)}` : ""}. A receipt is on its
              way to your inbox.
            </p>
            <div className="row">
              <Link href="/console" className="btn btn-primary">
                Go to dashboard
              </Link>
              <Link href="/console/settings/billing" className="btn btn-ghost">
                View billing
              </Link>
            </div>
          </div>
        </section>
      )}
      <p className="caption">
        {/* TODO(EPSILON-46): never claim Pro until the plan state confirms it. The
            mock client always returns success; the real one must read the service. */}
        Plan state is mocked in this scaffold.
      </p>
    </>
  );
}
