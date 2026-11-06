import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "./icons";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

/** Centered card used by login, register, forgot, reset and verify. */
export function AuthCard({ title, subtitle, children, footer, wide = false }: AuthCardProps) {
  return (
    <div className="auth-wrap">
      <Link href="/" className="auth-brand" aria-label="AudioKit home">
        <span className="brand-mark">
          <BrandMark size={22} />
        </span>
        AudioKit
      </Link>
      <div className={wide ? "auth-card auth-wide" : "auth-card"}>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="sub">{subtitle}</p> : null}
        </div>
        {children}
      </div>
      {footer ? <div className="auth-foot">{footer}</div> : null}
    </div>
  );
}
