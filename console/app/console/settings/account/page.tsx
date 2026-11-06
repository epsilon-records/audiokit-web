import type { Metadata } from "next";
import { DeleteAccount } from "@/components/delete-account";
import { client } from "@/lib/api-client";

export const metadata: Metadata = { title: "Settings · Account" };

export default async function AccountSettingsPage() {
  const account = await client.getAccount();

  return (
    <>
      <section className="panel">
        <div className="panel-bar">
          <span>Session</span>
        </div>
        <div className="panel-body">
          {/* TODO(EPSILON-46): wire sign out once the auth model is decided. */}
          <button type="button" className="btn btn-ghost">
            Sign out
          </button>
        </div>
      </section>

      <DeleteAccount email={account.email} />

      <p className="caption">
        {/* TODO(EPSILON-46): delete-account semantics, retention and export are
            open questions (docs/console/open-questions.md#data-retention). */}
        Deletion is blocked while a subscription is active.
      </p>
    </>
  );
}
