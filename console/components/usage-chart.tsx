import { formatNumber, formatShortDate } from "@/lib/format";

type Point = { date: string; jobs: number };

/**
 * Jobs per day for the current period. Inline SVG, no charting vendor
 * (docs/console/open-questions.md#charts). The adjacent table is the text
 * equivalent; each bar also carries a <title> for hover.
 */
export function UsageChart({ data, label }: { data: Point[]; label: string }) {
  const width = 720;
  const height = 180;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((point) => point.jobs));
  const slot = plotWidth / Math.max(1, data.length);
  const barWidth = Math.max(4, slot * 0.55);

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. ${data.length} days, peak ${formatNumber(max)} jobs.`}
      >
        {[0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = padding.top + plotHeight - plotHeight * fraction;
          return (
            <line
              key={fraction}
              className="chart-grid"
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
            />
          );
        })}
        {data.map((point, index) => {
          const barHeight = (point.jobs / max) * plotHeight;
          const x = padding.left + index * slot + (slot - barWidth) / 2;
          const y = padding.top + plotHeight - barHeight;
          return (
            <g key={point.date}>
              <rect
                className="chart-bar"
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(1, barHeight)}
                rx={2}
                tabIndex={0}
              >
                <title>{`${formatShortDate(point.date)}: ${formatNumber(point.jobs)} jobs`}</title>
              </rect>
              {index % Math.ceil(data.length / 6) === 0 ? (
                <text
                  className="chart-axis"
                  x={x + barWidth / 2}
                  y={height - 6}
                  textAnchor="middle"
                >
                  {formatShortDate(point.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="caption" style={{ marginTop: 8 }}>
        Jobs per day, current period. Values are also in the table below.
      </figcaption>
    </figure>
  );
}
