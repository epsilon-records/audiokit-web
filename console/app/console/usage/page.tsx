import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { Meter } from "@/components/meter";
import { OperationBreakdown } from "@/components/operation-breakdown";
import { PageHeader } from "@/components/page-header";
import { ToneBadge } from "@/components/status-badge";
import { UsageChart } from "@/components/usage-chart";
import { client } from "@/lib/api-client";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Usage" };

type HistoryRow = {
  period: string;
  jobs: number;
  limit: number;
  status: "within quota" | "quota reached" | "overage";
};

const historyColumns: Column<HistoryRow>[] = [
  { key: "period", header: "Period", render: (row) => row.period },
  { key: "jobs", header: "Jobs", numeric: true, render: (row) => formatNumber(row.jobs) },
  { key: "limit", header: "Limit", numeric: true, render: (row) => formatNumber(row.limit) },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <ToneBadge tone={row.status === "within quota" ? "ok" : "warn"}>{row.status}</ToneBadge>
    ),
  },
];

export default async function UsagePage() {
  const usage = await client.getUsage();
  const total = usage.byOperation.reduce((sum, row) => sum + row.jobs, 0);

  return (
    <>
      <PageHeader
        title="Usage"
        description="Jobs submitted this period, broken down by day and by operation."
        actions={
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <span className="dim">Period</span>
            <select className="select" defaultValue="current" aria-label="Usage period">
              <option value="current">This billing period</option>
              <option value="previous">Previous period</option>
            </select>
          </label>
        }
        stamp={`${formatShortDate(usage.periodStart)} – ${formatShortDate(usage.periodEnd)}`}
      />

      <section className="panel">
        <div className="panel-body stack">
          <div className="spread">
            <h2 className="section-title">Jobs</h2>
            <span className="dim mono">
              Quota {formatNumber(usage.jobLimit)}
            </span>
          </div>
          <Meter used={usage.jobsUsed} limit={usage.jobLimit} label="Jobs used this period" />
          <UsageChart data={usage.daily} label="Jobs per day this period" />
        </div>
      </section>

      <section className="stack">
        <div className="section-title-row">
          <h2 className="section-title">By operation</h2>
          <span className="dim caption">{formatNumber(total)} jobs this period</span>
        </div>
        <div className="panel">
          <div className="panel-body">
            <OperationBreakdown rows={usage.byOperation} />
          </div>
        </div>
        <details className="panel">
          <summary className="panel-bar" style={{ cursor: "pointer", listStyle: "none" }}>
            <span>Table view</span>
            <span className="dim">toggle</span>
          </summary>
          <DataTable
            caption="Jobs by operation this period"
            columns={[
              { key: "operation", header: "Operation", className: "mono-cell", render: (row) => row.operation },
              { key: "jobs", header: "Jobs", numeric: true, render: (row) => formatNumber(row.jobs) },
              {
                key: "share",
                header: "Share",
                numeric: true,
                render: (row) => `${Math.round((row.jobs / (total || 1)) * 100)}%`,
              },
            ]}
            rows={usage.byOperation}
            rowKey={(row) => row.operation}
          />
        </details>
      </section>

      <section className="stack">
        <div className="section-title-row">
          <h2 className="section-title">History — last 12 periods</h2>
          <Link href="/console/plan">Change plan →</Link>
        </div>
        <DataTable
          caption="Job counts and limits for the last twelve periods"
          columns={historyColumns}
          rows={usage.history}
          rowKey={(row) => row.period}
        />
        <p className="caption">
          Periods are calendar months in UTC. {/* TODO(EPSILON-46): confirm the
          billing-period anchor and display timezone (open questions). */}
        </p>
      </section>

      <section className="stack">
        <h2 className="section-title">Daily detail</h2>
        <DataTable
          caption="Jobs per day this period"
          columns={[
            { key: "date", header: "Date", render: (row) => formatDate(row.date) },
            { key: "jobs", header: "Jobs", numeric: true, render: (row) => formatNumber(row.jobs) },
          ]}
          rows={usage.daily}
          rowKey={(row) => row.date}
        />
      </section>
    </>
  );
}
