import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { client } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Billing" };

/** Return route from the hosted billing portal. Re-reads plan state. */
export default async function BillingReturnPage() {
  const [account, plans] = await Promise.all([client.getAccount(), client.getPlans()]);
  const plan = plans.find((item) => item.id === account.plan);

  return (
    <>
      <PageHeader title="Billing" />
      <section className="panel">
        <div className="panel-body stack">
          <h2 className="section-title">Billing updated</h2>
          <p className="dim">
            You&apos;re on the {plan?.name ?? "Free"} plan, renewing {formatDate(account.renewsAt)}.
          </p>
          <div className="row">
            <Link href="/console/settings/billing" className="btn btn-primary">
              Back to billing
            </Link>
            <Link href="/console" className="btn btn-ghost">
              Dashboard
            </Link>
          </div>
        </div>
      </section>
      <p className="caption">
        {/* TODO(EPSILON-46): distinguish "changes made" from "no changes" once the
            portal session can report it. */}
        Portal changes are re-read from the billing service.
      </p>
    </>
  );
}
