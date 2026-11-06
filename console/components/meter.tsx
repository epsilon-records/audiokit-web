import { formatNumber, formatPercent, percent } from "@/lib/format";

type MeterProps = {
  used: number;
  limit: number;
  label: string;
  /** Show the numeric caption under the bar. */
  caption?: boolean;
  warnAt?: number;
};

/**
 * A proportion bar. Always carries a text equivalent; colour is never the only
 * signal (docs/console/component-inventory.md §2).
 */
export function Meter({ used, limit, label, caption = true, warnAt = 80 }: MeterProps) {
  const value = percent(used, limit);
  const state = value >= 100 ? "warn" : value >= warnAt ? "warn" : "ok";
  return (
    <div className="meter">
      <div
        className="meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuetext={`${formatNumber(used)} of ${formatNumber(limit)} (${formatPercent(value)})`}
      >
        <div className={`meter-fill ${state}`} style={{ width: `${value}%` }} />
      </div>
      {caption ? (
        <div className="meter-caption">
          <span>
            {formatNumber(used)} / {formatNumber(limit)}
          </span>
          <span>{formatPercent(value)}</span>
        </div>
      ) : null}
    </div>
  );
}
