import type { JobStatus } from "@/lib/types";

type Tone = "ok" | "warn" | "accent" | "muted";

const jobTone: Record<JobStatus, Tone> = {
  succeeded: "ok",
  running: "accent",
  queued: "muted",
  failed: "warn",
};

const jobLabel: Record<JobStatus, string> = {
  succeeded: "succeeded",
  running: "running",
  queued: "queued",
  failed: "failed",
};

/** Status is always a text label; the dot is decoration. */
export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`badge badge-${jobTone[status]}`}>
      <span className="dot" aria-hidden />
      {jobLabel[status]}
    </span>
  );
}

export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
