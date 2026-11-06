"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";
import { DataTable, type Column } from "./data-table";
import { Dialog } from "./dialog";
import { EmptyState } from "./empty-state";
import { formatDate, relativeTime } from "@/lib/format";
import type { ApiKey } from "@/lib/types";

/**
 * API key list with create, reveal-once and revoke dialogs.
 *
 * All state is local mock state. The real calls belong in `lib/api-client.ts`
 * once the service exists; the reveal-once rule is a design requirement, not a
 * backend detail (docs/console/user-flows.md F6/F7).
 */
export function ApiKeysPanel({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  function createKey() {
    const id = `key_${String(keys.length + 1).padStart(4, "0")}`;
    const secret = `ak_live_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
    const key: ApiKey = {
      id,
      label: label.trim() || "untitled",
      prefix: `ak_live_…${secret.slice(-3)}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revoked: false,
    };
    setKeys((current) => [key, ...current]);
    setCreating(false);
    setLabel("");
    setRevealed(secret);
  }

  function revokeKey() {
    if (!revoking) return;
    setKeys((current) =>
      current.map((key) => (key.id === revoking.id ? { ...key, revoked: true } : key)),
    );
    setRevoking(null);
  }

  const columns: Column<ApiKey>[] = [
    {
      key: "label",
      header: "Label",
      render: (key) => (
        <span>
          {key.label}
          {key.revoked ? <span className="dim"> (revoked)</span> : null}
        </span>
      ),
    },
    { key: "prefix", header: "Key", className: "mono-cell", render: (key) => key.prefix },
    { key: "created", header: "Created", render: (key) => formatDate(key.createdAt) },
    { key: "lastUsed", header: "Last used", render: (key) => relativeTime(key.lastUsedAt) },
    {
      key: "actions",
      header: "",
      className: "actions",
      render: (key) =>
        key.revoked ? (
          <span className="dim">—</span>
        ) : (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRevoking(key)}>
            Revoke
          </button>
        ),
    },
  ];

  return (
    <>
      <div className="spread">
        <p className="dim" style={{ maxWidth: "60ch" }}>
          Keep keys secret. They authorise jobs and are billed to your plan.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          Create key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No API keys yet."
            actions={
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                Create key
              </button>
            }
          >
            Create a key to submit your first job.
          </EmptyState>
        </div>
      ) : (
        <DataTable caption="Your API keys" columns={columns} rows={keys} rowKey={(key) => key.id} />
      )}

      <Dialog
        title="Create API key"
        open={creating}
        onClose={() => setCreating(false)}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={createKey}>
              Create key
            </button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="key-label">Label (optional)</label>
          <input
            id="key-label"
            className="input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="staging"
            autoFocus
          />
          <p className="hint">A label helps you tell keys apart. It is not a secret.</p>
        </div>
        {/* TODO(EPSILON-46): too-many-keys and create-failed states. */}
      </Dialog>

      <Dialog
        title="Key created — copy it now"
        open={revealed !== null}
        onClose={() => setRevealed(null)}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setRevealed(null)}>
            Done
          </button>
        }
      >
        <p className="dim">This is the only time we&apos;ll show it.</p>
        <div className="panel-bar" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
          <code style={{ overflowWrap: "anywhere" }}>{revealed}</code>
          <CopyButton value={revealed ?? ""} />
        </div>
        <p className="caption">
          If you close this without copying, create another key. The secret is never shown again.
        </p>
      </Dialog>

      <Dialog
        title="Revoke API key"
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRevoking(null)}>
              Keep key
            </button>
            <button type="button" className="btn btn-danger" onClick={revokeKey}>
              Revoke key
            </button>
          </>
        }
      >
        <p>
          Revoke <strong>{revoking?.label}</strong> ({revoking?.prefix})?
        </p>
        <p className="dim">
          Any client using this key will start failing immediately. This can&apos;t be undone.
        </p>
      </Dialog>
    </>
  );
}
