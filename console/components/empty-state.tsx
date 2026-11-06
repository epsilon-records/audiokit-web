import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function EmptyState({ title, children, actions }: EmptyStateProps) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
