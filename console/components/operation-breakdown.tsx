import { formatNumber, formatPercent } from "@/lib/format";

type Row = { operation: string; jobs: number };

/** Share of jobs by operation. Each row is text, not a graphic. */
export function OperationBreakdown({ rows }: { rows: Row[] }) {
  const total = rows.reduce((sum, row) => sum + row.jobs, 0) || 1;
  return (
    <div className="stack" style={{ gap: 12 }}>
      {rows.map((row) => {
        const share = (row.jobs / total) * 100;
        return (
          <div key={row.operation} className="stack" style={{ gap: 4 }}>
            <div className="spread" style={{ fontSize: 14 }}>
              <span className="mono">{row.operation}</span>
              <span className="dim">
                {formatNumber(row.jobs)} · {formatPercent(share)}
              </span>
            </div>
            <div className="meter-track" aria-hidden>
              <div className="meter-fill" style={{ width: `${share}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
