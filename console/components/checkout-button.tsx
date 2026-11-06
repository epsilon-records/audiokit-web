"use client";

import { useState } from "react";
import { Alert } from "./alert";

/**
 * Starts hosted checkout. Stubbed: the Stripe session is created by the
 * billing service, which does not exist yet (knowledge decision 0014).
 */
export function CheckoutButton({ planName }: { planName: string }) {
  const [clicked, setClicked] = useState(false);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <button type="button" className="btn btn-primary" onClick={() => setClicked(true)}>
        Upgrade to {planName}
      </button>
      {clicked ? (
        <Alert tone="info" inline>
          Checkout isn&apos;t connected yet. The billing service will create the hosted session and
          return to <code>/console/upgrade/success</code>.
        </Alert>
      ) : null}
    </div>
  );
}
