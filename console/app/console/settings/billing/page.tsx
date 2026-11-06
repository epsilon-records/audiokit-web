import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ToneBadge } from "@/components/status-badge";
import { client } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export const metadata: Metadata = { title: "Settings · Billing" };

const invoiceColumns: Column<Invoice>[] = [
  { key: "date", header: "Date", render: (row) => formatDate(row.date) },
  { key: "amount", header: "Amount", numeric: true, render: (row) => row.amount },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <ToneBadge tone={row.status === "paid" ? "ok" : row.status === "past due" ? "warn" : "muted"}>
        {row.status}
      </ToneBadge>
    ),
  },
  {
    key: "invoice",
    header: "Invoice",
    className: "actions",
    render: (row) => (
      <a href={row.url} target="_blank" rel="noopener noreferrer">
        View ↗
      </a>
    ),
  },
];

export default async function BillingSettingsPage() {
  const [account, billing, plans] = await Promise.all([
    client.getAccount(),
    client.getBilling(),
    client.getPlans(),
  ]);
  const plan = plans.find((item) => item.id === billing.plan);

  return (
    <>
      <section className="panel">
        <div className="panel-bar">
          <span>Plan</span>
        </div>
        <div className="panel-body stack">
          <div className="spread">
            <div>
              <h2 className="section-title">{plan?.name ?? "Free"} plan</h2>
              <p className="dim">
                {plan?.jobLimit ? `${plan.jobLimit.toLocaleString("en-GB")} jobs / month` : "Custom volume"}
              </p>
            </div>
            <span className="dim">Renews / resets {formatDate(billing.renewsAt)}</span>
          </div>
          <div className="row">
            <Link href="/console/plan" className="btn btn-primary">
              {billing.plan === "free" ? "Upgrade to Pro" : "Change plan"}
            </Link>
            <Link href="/console/plan" className="btn btn-ghost">
              Compare plans
            </Link>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-bar">
          <span>Payment</span>
        </div>
        <div className="panel-body stack">
          {billing.paymentMethod ? (
            <p className="dim">{billing.paymentMethod}</p>
          ) : (
            <p className="dim">No payment method on file.</p>
          )}
          {billing.portalUrl ? (
            <a href={billing.portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              Open billing portal ↗
            </a>
          ) : (
            <div>
              <button type="button" className="btn btn-ghost" disabled>
                Open billing portal ↗
              </button>
              <p className="caption" style={{ marginTop: 8 }}>
                The portal is available once a paid plan is active.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="stack">
        <div className="section-title-row">
          <h2 className="section-title">Invoices</h2>
          <span className="dim caption">Managed in the billing portal</span>
        </div>
        {billing.invoices.length === 0 ? (
          <div className="panel">
            <EmptyState title="No invoices yet.">
              Invoices appear here after the first paid period.
            </EmptyState>
          </div>
        ) : (
          <DataTable
            caption="Invoices"
            columns={invoiceColumns}
            rows={billing.invoices}
            rowKey={(row) => row.id}
          />
        )}
      </section>

      <p className="caption">
        {/* TODO(EPSILON-46): Stripe approval (EPSILON-44), dunning/grace period and
            who owns cancellation are open questions. */}
        Payment details and invoices are handled by the hosted billing portal.
      </p>
    </>
  );
}
