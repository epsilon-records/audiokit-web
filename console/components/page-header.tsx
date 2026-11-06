import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  kicker?: string;
  description?: string;
  actions?: ReactNode;
  stamp?: string;
};

export function PageHeader({ title, kicker, description, actions, stamp }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="sub">{description}</p> : null}
      </div>
      {actions || stamp ? (
        <div className="actions">
          {stamp ? <span className="stamp">{stamp}</span> : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
