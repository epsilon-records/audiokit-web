import type { ReactNode } from "react";
import { WarnIcon } from "./icons";

type AlertProps = {
  tone?: "info" | "warn" | "error" | "success";
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  /** Inline alerts sit inside the page body; banners sit under the top bar. */
  inline?: boolean;
  role?: "status" | "alert";
};

export function Alert({
  tone = "info",
  icon,
  children,
  actions,
  inline = false,
  role = "status",
}: AlertProps) {
  const toneClass = tone === "info" ? "" : ` alert-${tone}`;
  return (
    <div className={`alert${toneClass}${inline ? " alert-inline" : ""}`} role={role}>
      <span className="alert-icon" aria-hidden>
        {icon ?? (tone === "warn" || tone === "error" ? <WarnIcon /> : "•")}
      </span>
      <div className="alert-body">{children}</div>
      {actions ? <div className="alert-actions">{actions}</div> : null}
    </div>
  );
}
