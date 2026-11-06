import type { ReactNode } from "react";

type StatTileProps = {
  label: string;
  value: ReactNode;
  context?: ReactNode;
  warn?: boolean;
  children?: ReactNode;
};

/** One number with a label, a context line and an optional embedded meter. */
export function StatTile({ label, value, context, warn = false, children }: StatTileProps) {
  return (
    <div className={warn ? "stat stat-warn" : "stat"}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {context ? <span className="stat-context">{context}</span> : null}
      {children}
    </div>
  );
}
