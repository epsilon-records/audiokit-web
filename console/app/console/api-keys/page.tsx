import type { Metadata } from "next";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { PageHeader } from "@/components/page-header";
import { client } from "@/lib/api-client";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const keys = await client.getApiKeys();

  return (
    <>
      <PageHeader
        title="API keys"
        description="Keys authorise jobs and are billed to your plan. Only the prefix is shown after creation."
      />
      <ApiKeysPanel initialKeys={keys} />
      <p className="caption">
        {/* TODO(EPSILON-46): key format, scoping, expiry and the per-account limit
            are open questions (docs/console/open-questions.md#api-keys). */}
        Key format and scoping are not final.
      </p>
    </>
  );
}
