"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "./alert";

type AuthFormProps = {
  children: ReactNode;
  submitLabel: string;
  /** Message shown after submit until auth is wired. */
  note?: string;
};

/**
 * Shared auth form shell: one error region, a busy submit state and no account
 * enumeration. The submit handler is a stub — auth is an open question
 * (docs/console/open-questions.md#auth).
 */
export function AuthForm({ children, submitLabel, note }: AuthFormProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      {submitted ? (
        <Alert tone="info" inline role="status">
          {note ?? "Authentication isn't connected yet. This is a scaffold."}
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
