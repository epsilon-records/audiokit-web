import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { PageHeader } from "@/components/page-header";
import { PlanCard } from "@/components/plan-card";
import { client } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage() {
  const [account, plans] = await Promise.all([client.getAccount(), client.getPlans()]);
  const current = plans.find((plan) => plan.id === account.plan);

  return (
    <>
      <PageHeader
        title="Plan"
        description={`You're on the ${current?.name ?? "Free"} plan — ${current?.jobLimit ?? 100} jobs/month, renews ${formatDate(account.renewsAt)}.`}
        actions={
          <Link href="/console/settings/billing" className="btn btn-ghost">
            Billing settings
          </Link>
        }
      />

      <section className="plan-grid" aria-label="Plans">
        {plans.map((plan) => {
          const isCurrent = plan.id === account.plan;
          if (isCurrent) {
            return <PlanCard key={plan.id} plan={plan} current cta={{ label: "Current plan", href: "/console/plan" }} />;
          }
          if (plan.id === "enterprise") {
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                cta={{ label: "Contact sales", href: "https://audiokit.ai/#access" }}
              />
            );
          }
          return (
            <article key={plan.id} className="plan-card plan-card-featured">
              <span className="plan-flag">Most popular</span>
              <div>
                <h2 className="plan-name">{plan.name}</h2>
              </div>
              <div className="plan-price">
                <span className="amount">{plan.priceLabel}</span>
                <span className="period">/ month</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.delta ? <p className="plan-delta">{plan.delta}</p> : null}
              <CheckoutButton planName={plan.name} />
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-body stack">
          <h2 className="section-title">Already on a paid plan?</h2>
          <p className="dim">
            Change plan, update payment details and download invoices in the billing portal.
          </p>
          <div className="row">
            <Link href="/console/settings/billing" className="btn btn-ghost">
              Open billing settings
            </Link>
            <a
              href="https://audiokit.ai/pricing/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-quiet"
            >
              Compare plans on the site ↗
            </a>
          </div>
        </div>
      </section>

      <p className="caption">
        {/* TODO(EPSILON-46): checkout, downgrade timing, overage and dunning are
            open questions (docs/console/open-questions.md#billing). */}
        Prices and limits are placeholders until the plan decisions are recorded.
      </p>
    </>
  );
}
