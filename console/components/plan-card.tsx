import Link from "next/link";
import type { Plan } from "@/lib/types";

type PlanCardProps = {
  plan: Plan;
  current?: boolean;
  /** Signed-in CTA label; defaults to the plan's action. */
  cta?: { label: string; href: string; primary?: boolean };
};

export function PlanCard({ plan, current = false, cta }: PlanCardProps) {
  const classes = ["plan-card"];
  if (current) classes.push("plan-card-current");
  else if (plan.featured) classes.push("plan-card-featured");

  return (
    <article className={classes.join(" ")}>
      {plan.featured && !current ? <span className="plan-flag">Most popular</span> : null}
      <div>
        <h2 className="plan-name">{plan.name}</h2>
        {current ? <p className="caption">Your current plan</p> : null}
      </div>
      <div className="plan-price">
        <span className="amount">{plan.priceLabel}</span>
        {plan.priceMonthly !== null ? <span className="period">/ month</span> : null}
      </div>
      <ul className="plan-features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {plan.delta ? <p className="plan-delta">{plan.delta}</p> : null}
      {cta ? (
        <Link
          href={cta.href}
          className={cta.primary ? "btn btn-primary" : "btn btn-ghost"}
          aria-disabled={current || undefined}
        >
          {cta.label}
        </Link>
      ) : null}
    </article>
  );
}
