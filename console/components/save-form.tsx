"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "./alert";

type SaveFormProps = {
  children: ReactNode;
  submitLabel?: string;
  /** Message shown after a stub save. */
  savedMessage?: string;
};

/** A settings form with a busy/saved state. Saving is a stub for now. */
export function SaveForm({
  children,
  submitLabel = "Save changes",
  savedMessage = "Saved. (Not connected yet — this is a scaffold.)",
}: SaveFormProps) {
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      {saved ? (
        <Alert tone="success" inline role="status">
          {savedMessage}
        </Alert>
      ) : null}
      {children}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
