// Refreshes contract/openapi.yaml, the copy of the API contract the build falls back to.
//
//   npm run contract:pull -- /path/to/audiokit     copy from a local clone of epsilon-records/audiokit
//   npm run contract:pull -- https://…/v1/openapi.yaml   download from a running API
//
// Commit the result with the docs changes it brings.

import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = process.argv[2];
if (!from) {
  console.error("usage: npm run contract:pull -- <path to audiokit clone | contract URL>");
  process.exit(2);
}

let text;
let source;
if (/^https?:\/\//.test(from)) {
  const res = await fetch(from);
  if (!res.ok) throw new Error(`${from}: HTTP ${res.status}`);
  text = await res.text();
  source = from;
} else {
  text = await readFile(join(from, "openapi.yaml"), "utf8");
  let commit = "unknown commit";
  try {
    commit = execFileSync("git", ["-C", from, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {}
  source = `epsilon-records/audiokit@${commit}`;
}

const doc = YAML.parse(text);
if (!doc?.openapi || !doc?.paths) throw new Error("that isn't an OpenAPI document");
await writeFile(join(root, "contract", "openapi.yaml"), text);
await writeFile(join(root, "contract", "SOURCE"), `${source}\n`);
console.log(`contract/openapi.yaml: version ${doc.info.version} from ${source}`);
