import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="kicker">404</p>
        <h1>Page not found</h1>
        <p className="sub">That console page doesn&apos;t exist.</p>
        <Link href="/console" className="btn btn-primary">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
