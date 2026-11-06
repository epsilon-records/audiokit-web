import type { Metadata } from "next";
import { SaveForm } from "@/components/save-form";
import { ToneBadge } from "@/components/status-badge";
import { client } from "@/lib/api-client";

export const metadata: Metadata = { title: "Settings · Profile" };

export default async function ProfileSettingsPage() {
  const account = await client.getAccount();

  return (
    <>
      <section className="panel">
        <div className="panel-bar">
          <span>Profile</span>
        </div>
        <div className="panel-body">
          <SaveForm>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" className="input" defaultValue={account.name} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="row" style={{ gap: 10 }}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  defaultValue={account.email}
                  style={{ flex: "1 1 260px" }}
                />
                {account.emailVerified ? (
                  <ToneBadge tone="ok">verified</ToneBadge>
                ) : (
                  <ToneBadge tone="warn">unverified</ToneBadge>
                )}
              </div>
              <p className="hint">Changing your email requires re-verification.</p>
            </div>
          </SaveForm>
        </div>
      </section>

      <section className="panel">
        <div className="panel-bar">
          <span>Password</span>
        </div>
        <div className="panel-body">
          <SaveForm submitLabel="Update password" savedMessage="Password change isn't connected yet.">
            <div className="field">
              <label htmlFor="current">Current password</label>
              <input
                id="current"
                name="current"
                type="password"
                className="input"
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="new">New password</label>
              <input
                id="new"
                name="new"
                type="password"
                className="input"
                autoComplete="new-password"
                aria-describedby="new-hint"
              />
              <p className="hint" id="new-hint">
                At least 12 characters.
              </p>
            </div>
          </SaveForm>
        </div>
      </section>

      <p className="caption">
        {/* TODO(EPSILON-46): whether a password change signs out other sessions is
            an open question (docs/console/open-questions.md#sessions). */}
        Session behaviour after a password change is not decided.
      </p>
    </>
  );
}
