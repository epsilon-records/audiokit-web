"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "./icons";

/**
 * Account disclosure. Keyboard: Enter/Space opens, Esc closes and returns focus,
 * clicking outside closes. Sign out is a stub until auth exists.
 */
export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="hide-sm">{email}</span>
        <ChevronIcon />
      </button>
      {open ? (
        <div className="account-menu" role="menu">
          <div className="who">{email}</div>
          <Link href="/console/settings/profile" role="menuitem" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link href="/console/settings/billing" role="menuitem" onClick={() => setOpen(false)}>
            Billing
          </Link>
          {/* TODO(EPSILON-46): wire sign out once the auth model is decided. */}
          <button type="button" role="menuitem" className="danger" onClick={() => setOpen(false)}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
