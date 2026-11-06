"use client";

import { useState } from "react";
import { Dialog } from "./dialog";

/**
 * Danger-zone delete flow. Requires typing the account email, as the design
 * specifies. Blocked while a subscription is active (mock: always allowed).
 */
export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="danger-zone">
      <h2>Delete account</h2>
      <p className="dim">
        Revokes all API keys and removes your jobs and usage data. Invoices are kept for tax. This
        can&apos;t be undone.
      </p>
      {done ? (
        <p className="caption">Deletion isn&apos;t connected yet. This is a scaffold.</p>
      ) : (
        <div>
          <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
            Delete account…
          </button>
        </div>
      )}

      <Dialog
        title="Delete account"
        open={open}
        onClose={() => setOpen(false)}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!matches}
              onClick={() => {
                setOpen(false);
                setDone(true);
              }}
            >
              Delete account
            </button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="confirm-email">Type {email} to confirm.</label>
          <input
            id="confirm-email"
            className="input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            aria-invalid={typed.length > 0 && !matches}
          />
          {typed.length > 0 && !matches ? (
            <p className="error">That doesn&apos;t match the account email.</p>
          ) : null}
        </div>
        <p className="caption">
          {/* TODO(EPSILON-46): retention/erasure semantics and whether deletion is
              immediate or has a grace period (open questions). */}
          Active subscriptions must be cancelled first.
        </p>
      </Dialog>
    </div>
  );
}
