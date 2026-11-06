// Keeps the bundled contract honest: fails when contract/openapi.yaml no longer matches the
// contract the live API serves. Skips (with a diagnostic) when the API can't be reached, so an
// offline run doesn't fail. Run: npm test. Refresh with `npm run contract:pull`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContract } from "../scripts/check-contract.mjs";

test("bundled contract matches the live API contract", async (t) => {
  const result = await checkContract();

  if (result.status === "skipped") {
    t.diagnostic(`skipped: could not reach ${result.url} (${result.reason})`);
    return;
  }

  assert.equal(
    result.status,
    "in-sync",
    `contract/openapi.yaml is out of date with ${result.url} ` +
      `(bundled v${result.bundledVersion}, live v${result.liveVersion}). ` +
      `Run "npm run contract:pull -- ${result.url}" and commit the result.` +
      (result.changes?.length ? `\nChanges:\n  ${result.changes.join("\n  ")}` : ""),
  );
});
