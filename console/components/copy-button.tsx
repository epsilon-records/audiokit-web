"use client";

import { useState } from "react";

/**
 * Copy control with an aria-live confirmation. Falls back to a visible message
 * when the clipboard API is unavailable.
 */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <button type="button" className="copy" onClick={copy}>
        {state === "copied" ? "Copied" : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </>
  );
}
