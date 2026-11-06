import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Meter } from "@/components/meter";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { client } from "@/lib/api-client";
import { formatDate, formatNumber, formatTime, percent } from "@/lib/format";
import { apiBaseUrl } from "@/lib/mock-data";
import type { Job } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

const jobColumns: Column<Job>[] = [
  { key: "id", header: "Job id", className: "mono-cell", render: (job) => `… ${job.id}` },
  { key: "operation", header: "Operation", render: (job) => <span className="mono">{job.operation}</span> },
  { key: "status", header: "Status", render: (job) => <StatusBadge status={job.status} /> },
  { key: "created", header: "Created", render: (job) => formatTime(job.createdAt) },
  {
    key: "detail",
    header: "Detail",
    className: "actions",
    render: (job) => (
      <Link href={`/console/usage#job-${job.id}`} aria-label={`Detail for job ${job.id}`}>
        →
      </Link>
    ),
  },
];

export default async function DashboardPage() {
  const [account, usage, jobs, plans] = await Promise.all([
    client.getAccount(),
    client.getUsage(),
    client.getRecentJobs(5),
    client.getPlans(),
  ]);

  const plan = plans.find((item) => item.id === account.plan);
  const remaining = Math.max(0, usage.jobLimit - usage.jobsUsed);
  const used = percent(usage.jobsUsed, usage.jobLimit);
  const atLimit = usage.jobsUsed >= usage.jobLimit;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your usage this period, recent jobs and a quick way to submit the next one."
        stamp={`last updated ${formatTime(new Date().toISOString())}`}
      />

      <section className="grid grid-4" aria-label="Account summary">
        <StatTile
          label="Jobs / month"
          value={formatNumber(usage.jobsUsed)}
          context={`${plan?.name ?? "Free"} · ${formatNumber(usage.jobLimit)} limit`}
          warn={atLimit}
        >
          <Meter used={usage.jobsUsed} limit={usage.jobLimit} label="Jobs used this period" caption={false} />
        </StatTile>
        <StatTile
          label="Remaining"
          value={formatNumber(remaining)}
          context={atLimit ? "Resets " + formatDate(usage.periodEnd) : "Until the period resets"}
        />
        <StatTile
          label="Plan"
          value={plan?.name ?? "Free"}
          context={`Renews ${formatDate(account.renewsAt)}`}
        >
          <Link href="/console/plan" className="btn btn-ghost btn-sm">
            Upgrade
          </Link>
        </StatTile>
        <StatTile label="API keys" value="2 active" context="1 revoked">
          <Link href="/console/api-keys" className="btn btn-quiet btn-sm">
            Manage →
          </Link>
        </StatTile>
      </section>

      <section className="stack">
        <div className="section-title-row">
          <h2 className="section-title">Recent jobs</h2>
          <Link href="/console/usage">View all →</Link>
        </div>
        {jobs.length === 0 ? (
          <div className="panel">
            <EmptyState
              title="No jobs yet."
              actions={
                <>
                  <Link href="/console/api-keys" className="btn btn-primary">
                    Create API key
                  </Link>
                  <a
                    href="https://audiokit.ai/docs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    Read the guide ↗
                  </a>
                </>
              }
            >
              Create an API key, then submit your first job.
            </EmptyState>
          </div>
        ) : (
          <DataTable
            caption="The five most recent jobs"
            columns={jobColumns}
            rows={jobs}
            rowKey={(job) => job.id}
          />
        )}
      </section>

      <section className="stack">
        <h2 className="section-title">Quick start</h2>
        <details className="panel" open>
          <summary className="panel-bar" style={{ cursor: "pointer", listStyle: "none" }}>
            <span>Base URL and a first request</span>
            <span className="dim">toggle</span>
          </summary>
          <div className="stack" style={{ gap: 0 }}>
            <div className="panel-bar">
              <span>{apiBaseUrl}</span>
              <CopyButton value={apiBaseUrl} />
            </div>
            <pre className="code">{`curl -X POST ${apiBaseUrl}/v1/jobs \\
  -H "Authorization: Bearer $AUDIOKIT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"operation":"probe","url":"https://example.com/track.mp3"}'`}</pre>
            <div className="panel-bar" style={{ borderTop: "1px solid var(--line)", borderBottom: 0 }}>
              <a href="https://audiokit.ai/docs/" target="_blank" rel="noopener noreferrer">
                Get started guide ↗
              </a>
              <span className="dim">API v0.1</span>
            </div>
          </div>
        </details>
        <p className="caption">
          Quota is at {Math.round(used)}% of the {plan?.name ?? "Free"} plan.{" "}
          {/* TODO(EPSILON-46): replace mock data with the billing/accounts service. */}
        </p>
      </section>
    </>
  );
}
