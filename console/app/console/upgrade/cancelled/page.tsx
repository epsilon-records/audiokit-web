import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Checkout cancelled" };

export default function UpgradeCancelledPage() {
  return (
    <>
      <PageHeader title="Upgrade" />
      <section className="panel">
        <div className="panel-body stack">
          <h2 className="section-title">Checkout cancelled — you haven&apos;t been charged.</h2>
          <p className="dim">You can pick up where you left off whenever you&apos;re ready.</p>
          <div className="row">
            <Link href="/console/plan" className="btn btn-primary">
              Try again
            </Link>
            <Link href="/console/plan" className="btn btn-ghost">
              Back to plan
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
