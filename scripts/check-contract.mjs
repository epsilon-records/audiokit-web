// Checks that the bundled contract still matches the one the live API serves.
//
//   npm run contract:check              # warn and exit 0 on drift (safe in dev)
//   npm run contract:check:strict       # exit 1 on drift (use in CI)
//   node scripts/check-contract.mjs --offline   # skip the network fetch
//
// The live contract is public (decision 0011: audiokit/decisions/0011-api-contract-is-public.md),
// so no token is needed. When the API can't be reached the check is skipped with a warning, so
// an outage or an offline machine never breaks the build.
//
// Refresh the bundled copy with `npm run contract:pull -- <contract URL>`.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";
import config from "../site.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundledPath = join(root, "contract", "openapi.yaml");
const sourcePath = join(root, "contract", "SOURCE");

// Sort object keys while walking, so two documents compare equal regardless of key order.
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

const canonical = (doc) => JSON.stringify(stable(doc));

// A human-readable list of what changed between two OpenAPI documents.
export function diffSummary(bundled, live) {
  const lines = [];

  const bInfo = bundled?.info ?? {};
  const lInfo = live?.info ?? {};
  if (bInfo.version !== lInfo.version) lines.push(`info.version: ${bInfo.version} → ${lInfo.version}`);
  if (bInfo.title !== lInfo.title) lines.push(`info.title: ${bInfo.title} → ${lInfo.title}`);

  const bPaths = bundled?.paths ?? {};
  const lPaths = live?.paths ?? {};
  for (const p of [...new Set([...Object.keys(bPaths), ...Object.keys(lPaths)])].sort()) {
    if (!(p in bPaths)) lines.push(`path added: ${p}`);
    else if (!(p in lPaths)) lines.push(`path removed: ${p}`);
    else {
      const bOps = bPaths[p] ?? {};
      const lOps = lPaths[p] ?? {};
      for (const m of [...new Set([...Object.keys(bOps), ...Object.keys(lOps)])].sort()) {
        if (!(m in bOps)) lines.push(`operation added: ${m.toUpperCase()} ${p}`);
        else if (!(m in lOps)) lines.push(`operation removed: ${m.toUpperCase()} ${p}`);
        else if (canonical(bOps[m]) !== canonical(lOps[m])) lines.push(`operation changed: ${m.toUpperCase()} ${p}`);
      }
    }
  }

  const bSchemas = bundled?.components?.schemas ?? {};
  const lSchemas = live?.components?.schemas ?? {};
  for (const s of [...new Set([...Object.keys(bSchemas), ...Object.keys(lSchemas)])].sort()) {
    if (!(s in bSchemas)) lines.push(`schema added: ${s}`);
    else if (!(s in lSchemas)) lines.push(`schema removed: ${s}`);
    else if (canonical(bSchemas[s]) !== canonical(lSchemas[s])) lines.push(`schema changed: ${s}`);
  }

  for (const key of [...new Set([...Object.keys(bundled ?? {}), ...Object.keys(live ?? {})])].sort()) {
    if (key === "paths" || key === "components") continue;
    if (canonical(bundled?.[key]) !== canonical(live?.[key])) lines.push(`section changed: ${key}`);
  }

  return lines;
}

// Returns one of:
//   { status: "in-sync", url, version }
//   { status: "drift", url, bundledVersion, liveVersion, changes }
//   { status: "skipped", url, reason }
export async function checkContract({ url, timeoutMs = 10_000, fetchImpl = fetch } = {}) {
  const bundledText = await readFile(bundledPath, "utf8");
  const bundled = YAML.parse(bundledText);
  const liveUrl = url ?? process.env.AUDIOKIT_OPENAPI_URL ?? `${config.apiBaseUrl}/v1/openapi.yaml`;

  let liveText;
  try {
    const res = await fetchImpl(liveUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    liveText = await res.text();
  } catch (err) {
    return { status: "skipped", url: liveUrl, reason: err.message };
  }

  let live;
  try {
    live = YAML.parse(liveText);
    if (!live?.openapi || !live?.paths) throw new Error("not an OpenAPI document");
  } catch (err) {
    return { status: "skipped", url: liveUrl, reason: `live contract is not usable: ${err.message}` };
  }

  if (canonical(bundled) === canonical(live)) {
    return { status: "in-sync", url: liveUrl, version: live.info?.version };
  }
  return {
    status: "drift",
    url: liveUrl,
    bundledVersion: bundled?.info?.version,
    liveVersion: live?.info?.version,
    changes: diffSummary(bundled, live),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  if (args.has("--offline")) {
    console.log("contract check: skipped (--offline)");
    return 0;
  }

  const result = await checkContract();
  let source = "";
  try {
    source = (await readFile(sourcePath, "utf8")).trim();
  } catch {}

  if (result.status === "skipped") {
    console.warn(`contract check: skipped, could not reach ${result.url}: ${result.reason}`);
    return 0;
  }
  if (result.status === "in-sync") {
    console.log(`contract check: contract/openapi.yaml is in sync with ${result.url} (version ${result.version})`);
    return 0;
  }

  console.error(`contract check: contract/openapi.yaml is out of date with ${result.url}`);
  if (source) console.error(`  bundled SOURCE: ${source}`);
  console.error(`  bundled version: ${result.bundledVersion} · live version: ${result.liveVersion}`);
  for (const change of result.changes.slice(0, 40)) console.error(`  - ${change}`);
  if (result.changes.length > 40) console.error(`  … and ${result.changes.length - 40} more`);
  console.error(`  fix: npm run contract:pull -- ${result.url} && npm run build`);
  return args.has("--strict") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`contract check: ${err.message}`);
      process.exit(1);
    },
  );
}
