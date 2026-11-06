"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import { CloseIcon, ExternalIcon, MenuIcon } from "./icons";
import { SideNav } from "./side-nav";

type ShellProps = {
  email: string;
  planName: string;
  planWarn?: boolean;
  apiVersion: string;
  banners?: ReactNode;
  children: ReactNode;
};

/**
 * The signed-in frame: top bar, side nav, banners slot and main region.
 * On ≤720 px the side nav becomes a drawer opened from the top bar.
 */
export function ConsoleShell({
  email,
  planName,
  planWarn = false,
  apiVersion,
  banners,
  children,
}: ShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="shell">
      <a className="skip" href="#console-main">
        Skip to content
      </a>

      <header className="shell-topbar">
        <div className="row" style={{ gap: 12 }}>
          <button
            type="button"
            className="icon-btn mobile-bar"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
          <Brand />
          <span className={planWarn ? "plan-badge plan-badge-warn" : "plan-badge"}>
            {planWarn ? "Past due" : planName}
          </span>
        </div>
        <div className="topbar-right">
          <a href="https://audiokit.ai/docs/" target="_blank" rel="noopener noreferrer" className="hide-sm">
            Docs <ExternalIcon />
          </a>
          <AccountMenu email={email} />
        </div>
      </header>

      <aside className="shell-side">
        <SideNav apiVersion={apiVersion} />
      </aside>

      {drawerOpen ? (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Console navigation">
            <div>
              <div className="spread" style={{ marginBottom: 16 }}>
                <Brand />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Close navigation"
                  onClick={() => setDrawerOpen(false)}
                >
                  <CloseIcon />
                </button>
              </div>
              <div onClick={() => setDrawerOpen(false)}>
                <SideNav apiVersion={apiVersion} />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <main className="shell-main" id="console-main">
        {banners ? <div className="shell-banners">{banners}</div> : null}
        <div className="shell-body">{children}</div>
      </main>
    </div>
  );
}

/** A link that leaves the console. */
export function OutboundLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} <ExternalIcon />
    </a>
  );
}
