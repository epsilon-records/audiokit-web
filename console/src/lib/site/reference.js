// Renders the API reference from the OpenAPI contract. Everything on /docs/reference/ comes from
// the contract: nothing here should state a fact about the API that the contract doesn't.

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// --- Markdown (the subset the contract uses: paragraphs, "- " lists, `code`, **bold**) --------

// Schema names in backticks link to the schema, once renderReference has set them.
let schemaNames = new Set();

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => (schemaNames.has(c) ? `<a href="#schema-${c}"><code>${c}</code></a>` : `<code>${c}</code>`))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function md(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim());
      if (lines[0].startsWith("- ")) {
        const items = [];
        for (const l of lines) {
          if (l.startsWith("- ")) items.push(l.slice(2));
          else items[items.length - 1] += " " + l;
        }
        return `<ul>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`;
      }
      return `<p>${inline(lines.join(" "))}</p>`;
    })
    .join("");
}

// Parses "- `code`: text" and "- `a` / `b`: text" bullets into { code: text }.
function bullets(text) {
  const map = {};
  for (const line of String(text || "").split("\n")) {
    const m = /^\s*-\s+((?:`[^`]+`(?:\s*\/\s*)?)+):\s*(.+)$/.exec(line);
    if (!m) continue;
    for (const [, code] of m[1].matchAll(/`([^`]+)`/g)) map[code] = m[2].trim();
  }
  return map;
}

// --- Schemas ----------------------------------------------------------------------------------

const refName = (ref) => ref.split("/").pop();

function deref(doc, s) {
  let seen = 0;
  while (s && s.$ref && seen++ < 20) s = doc.components.schemas[refName(s.$ref)];
  return s || {};
}

const schemaLink = (name) => `<a href="#schema-${name}"><code>${name}</code></a>`;

function enumValues(s) {
  if (s.enum) return s.enum;
  for (const alt of s.anyOf || []) if (alt.enum) return alt.enum;
  return null;
}

function typeLabel(doc, s) {
  if (!s || typeof s !== "object") return "any";
  if (s.$ref) return schemaLink(refName(s.$ref));
  if ("const" in s) return `<code>${esc(JSON.stringify(s.const))}</code>`;
  if (s.enum) return s.enum.map((v) => `<code>${esc(v === null ? "null" : v)}</code>`).join(" | ");
  if (s.allOf && s.allOf.length === 1) return typeLabel(doc, s.allOf[0]);
  if (s.anyOf || s.oneOf) {
    const alts = s.anyOf || s.oneOf;
    // An open enum ("these codes, or any string") reads better as just the codes plus a note.
    return alts.map((a) => typeLabel(doc, a)).join(" or ");
  }
  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : [];
  const parts = types.map((t) => {
    if (t === "array") return `array of ${typeLabel(doc, s.items)}`;
    if (t === "object" && s.additionalProperties && typeof s.additionalProperties === "object")
      return `map of ${typeLabel(doc, s.additionalProperties)}`;
    if (t === "string" && s.format) return `string (${esc(s.format)})`;
    return t;
  });
  return parts.length ? parts.join(" or ") : s.allOf ? "object" : "any";
}

function constraints(s) {
  const c = [];
  if (s.default !== undefined) c.push(`default <code>${esc(JSON.stringify(s.default))}</code>`);
  if (s.minimum !== undefined && s.maximum !== undefined) c.push(`${s.minimum}–${s.maximum}`);
  else if (s.minimum !== undefined) c.push(`≥ ${s.minimum}`);
  else if (s.maximum !== undefined) c.push(`≤ ${s.maximum}`);
  if (s.minItems !== undefined && s.minItems === s.maxItems) c.push(`exactly ${s.minItems} items`);
  else {
    if (s.minItems !== undefined) c.push(`at least ${s.minItems} items`);
    if (s.maxItems !== undefined) c.push(`at most ${s.maxItems} items`);
  }
  if (s.pattern) c.push(`pattern <code>${esc(s.pattern)}</code>`);
  if (s.examples) c.push(`e.g. ${s.examples.map((e) => `<code>${esc(e)}</code>`).join(", ")}`);
  return c.join(" · ");
}

// Flattens properties from an object schema, following $ref and allOf.
function collectFields(doc, schema, acc = { rows: new Map(), additional: null }) {
  const s = schema.$ref ? deref(doc, schema) : schema;
  for (const part of s.allOf || []) collectFields(doc, part, acc);
  for (const [name, prop] of Object.entries(s.properties || {})) {
    const prev = acc.rows.get(name);
    acc.rows.set(name, { prop, required: prev?.required || false });
  }
  for (const name of s.required || []) {
    if (acc.rows.has(name)) acc.rows.get(name).required = true;
  }
  if (s.additionalProperties && typeof s.additionalProperties === "object") acc.additional = s.additionalProperties;
  return acc;
}

function fieldDescription(doc, prop) {
  if (prop.description) return prop.description;
  // A field pointing at a scalar schema (e.g. Decibels) borrows that schema's description.
  const target = prop.$ref ? deref(doc, prop) : prop.allOf?.length === 1 ? deref(doc, prop.allOf[0]) : null;
  if (target && !target.properties && !target.allOf && target.description) return target.description;
  return "";
}

function fieldsTable(doc, schema, { additionalLabel = "other keys" } = {}) {
  const { rows, additional } = collectFields(doc, schema);
  if (!rows.size && !additional) return "";
  const tr = [...rows].map(([name, { prop, required }]) => {
    const target = prop.$ref ? deref(doc, prop) : prop;
    const extra = constraints(prop) || constraints(target);
    const desc = fieldDescription(doc, prop);
    return `<tr><td class="mono">${esc(name)}${required ? "" : '<span class="opt">optional</span>'}</td><td class="type">${typeLabel(doc, prop)}</td><td class="soft">${md(desc)}${extra ? `<p class="constraints">${extra}</p>` : ""}</td></tr>`;
  });
  if (additional) {
    tr.push(
      `<tr><td class="mono"><em>${esc(additionalLabel)}</em><span class="opt">optional</span></td><td class="type">${typeLabel(doc, additional)}</td><td class="soft"></td></tr>`,
    );
  }
  return `<div class="table-box"><table class="fields"><thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Notes</th></tr></thead><tbody>${tr.join("")}</tbody></table></div>`;
}

// --- Operations: params, outputs and result shape per operation ------------------------------

function opsIn(ifClause) {
  const p = ifClause?.properties?.operation;
  if (!p) return [];
  return "const" in p ? [p.const] : p.enum || [];
}

function pickRef(s) {
  if (!s) return null;
  if (s.$ref) return refName(s.$ref);
  for (const alt of s.anyOf || []) if (alt.$ref) return refName(alt.$ref);
  return null;
}

export function operationModel(doc) {
  const S = doc.components.schemas;
  const names = S.Operation.enum;
  const descs = bullets(S.Operation.description);
  const model = Object.fromEntries(
    names.map((n) => [n, { name: n, description: descs[n] || "", params: null, paramsRequired: false, outputs: [], result: null }]),
  );
  for (const rule of S.JobRequest.allOf || []) {
    for (const op of opsIn(rule.if)) {
      const m = model[op];
      if (!m) continue;
      const then = rule.then || {};
      const params = pickRef(then.properties?.params);
      if (params) m.params = params;
      if (then.required?.includes("params")) m.paramsRequired = true;
      const outs = then.properties?.outputs?.required;
      if (outs) m.outputs = outs;
    }
  }
  for (const rule of S.Job.allOf || []) {
    for (const op of opsIn(rule.if)) {
      const ref = pickRef(rule.then?.properties?.result);
      if (model[op] && ref) model[op].result = ref;
    }
  }
  return names.map((n) => model[n]);
}

// Grouping on the landing page. Anything new in the contract lands in "More" until it's placed.
const GROUPS = [
  { title: "Files", blurb: "Check, measure and convert the file itself.", ops: ["probe", "loudness", "waveform", "transcode", "preview"] },
  { title: "Music analysis", blurb: "Tempo, key, identity and tags, separately or from one read with analyze.", ops: ["tempo", "key", "fingerprint", "analyze", "tags"] },
];

export function renderOperationList(doc, ops) {
  const placed = new Set(GROUPS.flatMap((g) => g.ops));
  const groups = GROUPS.map((g) => ({ ...g, items: g.ops.map((n) => ops.find((o) => o.name === n)).filter(Boolean) }));
  const rest = ops.filter((o) => !placed.has(o.name));
  if (rest.length) groups.push({ title: "More", blurb: "", items: rest });
  schemaNames = new Set(); // the landing page has no schema anchors
  return groups
    .filter((g) => g.items.length)
    .map(
      (g) => `<div class="op-group">
  <div class="op-group-head"><h3>${esc(g.title)}</h3>${g.blurb ? `<p>${esc(g.blurb)}</p>` : ""}</div>
  <ul class="op-list">${g.items
    .map(
      (o) =>
        `<li><a href="/docs/reference/#operation-${o.name}"><code class="op-name">${o.name}</code><span class="op-desc">${inline(capitalise(o.description))}</span>${o.outputs.length ? '<span class="op-flag">writes a file</span>' : ""}</a></li>`,
    )
    .join("")}</ul>
</div>`,
    )
    .join("");
}

const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// --- Webhook test vector ----------------------------------------------------------------------

export function webhookTestVector(doc) {
  const v = Object.values(doc.webhooks || {})[0]?.post?.["x-signature-test-vector"];
  if (!v) return "";
  return `<div class="panel"><div class="panel-bar"><span>webhook signature test vector</span></div><pre class="code">secret  ${esc(v.secret)}
body    ${esc(v.body)}
header  ${esc(v.header)}</pre></div>`;
}

// --- Error codes ------------------------------------------------------------------------------

function apiErrorRows(doc) {
  const codes = enumValues(doc.components.schemas.ApiErrorCode) || [];
  const found = {};
  const scan = (status, desc) => {
    for (const line of String(desc || "").split("\n")) {
      const m = /^\s*"?`([a-z_]+)`:\s*(.+?)"?\s*$/.exec(line);
      if (m && codes.includes(m[1])) {
        found[m[1]] ??= { statuses: new Set(), text: m[2] };
        found[m[1]].statuses.add(status);
      }
    }
  };
  const named = doc.components.responses || {};
  for (const path of Object.values(doc.paths)) {
    for (const op of Object.values(path)) {
      for (const [status, r] of Object.entries(op.responses || {})) {
        const res = r.$ref ? named[refName(r.$ref)] : r;
        scan(status, res?.description);
      }
    }
  }
  return codes.map((c) => {
    const f = found[c];
    return `<tr><td class="mono">${c}</td><td class="mono">${f ? [...f.statuses].join(", ") : ""}</td><td class="soft">${f ? inline(capitalise(f.text)) : ""}</td></tr>`;
  });
}

// --- Endpoints --------------------------------------------------------------------------------

const METHODS = ["get", "post", "put", "patch", "delete"];

function endpoint(doc, path, method, op, pathParams) {
  const id = `op-${op.operationId || `${method}-${path}`.replace(/[^a-z0-9]+/gi, "-")}`;
  const open = Array.isArray(op.security) && op.security.length === 0;
  const params = [...(pathParams || []), ...(op.parameters || [])].map((p) =>
    p.$ref ? doc.components.parameters[refName(p.$ref)] : p,
  );
  const body = op.requestBody?.content?.["application/json"];
  const named = doc.components.responses || {};
  const responses = Object.entries(op.responses || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, r]) => {
      const res = r.$ref ? named[refName(r.$ref)] : r;
      const content = res.content || {};
      const [type, media] = Object.entries(content)[0] || [];
      const schema = media?.schema;
      const shape = schema ? (schema.$ref ? schemaLink(refName(schema.$ref)) : `<code>${esc(type)}</code>`) : "";
      return `<tr><td class="mono status s${status[0]}">${status}</td><td class="soft">${md(res.description)}</td><td>${shape}</td></tr>`;
    });

  let examples = "";
  if (body?.examples) {
    examples = Object.entries(body.examples)
      .map(
        ([, ex]) => `<div class="panel"><div class="panel-bar"><span>${esc(ex.summary || "Example")}</span><span>request body</span></div><pre class="code">${esc(JSON.stringify(ex.value, null, 2))}</pre></div>`,
      )
      .join("");
  }

  return `<article class="endpoint" aria-labelledby="${id}">
  <h3 id="${id}" data-toc="${esc(op.summary || path)}"><span class="method m-${method}">${method.toUpperCase()}</span> <code class="path">${esc(path)}</code></h3>
  <p class="endpoint-summary">${esc(op.summary || "")}<span class="auth ${open ? "auth-open" : ""}">${open ? "No API key" : "API key"}</span></p>
  ${md(op.description)}
  ${
    params.length
      ? `<h4>Parameters</h4><div class="table-box"><table class="fields"><thead><tr><th scope="col">Name</th><th scope="col">In</th><th scope="col">Notes</th></tr></thead><tbody>${params
          .map(
            (p) => `<tr><td class="mono">${esc(p.name)}</td><td>${esc(p.in)}</td><td class="soft">${md(p.description)}<p class="constraints">${typeLabel(doc, p.schema)}</p></td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : ""
  }
  ${body ? `<h4>Request body: ${schemaLink(refName(body.schema.$ref))}</h4>${fieldsTable(doc, body.schema)}${examples}` : ""}
  <h4>Responses</h4>
  <div class="table-box"><table class="fields responses"><thead><tr><th scope="col">Status</th><th scope="col">Meaning</th><th scope="col">Body</th></tr></thead><tbody>${responses.join("")}</tbody></table></div>
</article>`;
}

// --- Page -------------------------------------------------------------------------------------

export function renderReference(doc, ops, config) {
  const S = doc.components.schemas;
  schemaNames = new Set(Object.keys(S));
  const version = doc.info.version;
  const base = esc(config.apiBaseUrl);

  const endpoints = [];
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      if (item[method]) endpoints.push(endpoint(doc, path, method, item[method], item.parameters));
    }
  }

  const operations = ops
    .map((o) => {
      const paramsBlock = o.params
        ? `<h4>Params: ${schemaLink(o.params)}${o.paramsRequired ? "" : ' <span class="opt">optional</span>'}</h4>${md(S[o.params].description)}${
            fieldsTable(doc, { $ref: `#/components/schemas/${o.params}` }) || "<p>Send no params, or <code>null</code>.</p>"
          }`
        : "";
      const outputs = o.outputs.length
        ? `<p>Needs an upload target in <code>outputs</code> for: ${o.outputs.map((x) => `<code>${x}</code>`).join(", ")}. See ${schemaLink("OutputTarget")}.</p>`
        : `<p>Writes no files: send no <code>outputs</code>.</p>`;
      const result = o.result
        ? `<h4>Result: ${schemaLink(o.result)}</h4>${md(S[o.result].description)}${fieldsTable(doc, { $ref: `#/components/schemas/${o.result}` }, { additionalLabel: "{label group}" })}`
        : "";
      return `<article class="operation">
  <h3 id="operation-${o.name}" data-toc="${o.name}"><code>${o.name}</code></h3>
  <p class="lead">${inline(capitalise(o.description))}.</p>
  ${outputs}
  ${paramsBlock}
  ${result}
</article>`;
    })
    .join("");

  const hook = Object.entries(doc.webhooks || {}).map(([name, w]) => {
    const p = w.post;
    const header = (p.parameters || []).find((x) => x.in === "header");
    const schema = p.requestBody?.content?.["application/json"]?.schema;
    return `<article class="endpoint">
  <h3 id="webhook-${name}" data-toc="${esc(p.summary || name)}"><span class="method m-post">POST</span> <code class="path">your webhook.url</code></h3>
  <p class="endpoint-summary">${esc(p.summary || "")}</p>
  ${md(p.description)}
  ${header ? `<h4>Header</h4><div class="table-box"><table class="fields"><tbody><tr><td class="mono">${esc(header.name)}</td><td class="soft"><p class="constraints">pattern <code>${esc(header.schema?.pattern || "")}</code></p></td></tr></tbody></table></div>` : ""}
  <h4>Signature test vector</h4>
  ${webhookTestVector(doc)}
  ${schema ? `<h4>Body: ${schemaLink(refName(schema.$ref))}</h4>${fieldsTable(doc, schema)}` : ""}
</article>`;
  });

  const jobCodes = bullets(S.JobErrorCode.description);
  const jobErrorRows = (enumValues(S.JobErrorCode) || []).map(
    (c) => `<tr><td class="mono">${c}</td><td class="soft">${jobCodes[c] ? inline(capitalise(jobCodes[c])) : ""}</td></tr>`,
  );

  const schemas = Object.entries(S)
    .map(([name, s]) => {
      const values = enumValues(s);
      const table = fieldsTable(doc, { $ref: `#/components/schemas/${name}` }, { additionalLabel: "{key}" });
      let shape = "";
      if (table) shape = table;
      else if (values) shape = `<p class="values">${values.map((v) => `<code>${esc(v)}</code>`).join(" ")}${s.anyOf ? ' <span class="opt">or another string: new values may be added</span>' : ""}</p>`;
      else shape = `<p class="constraints">${typeLabel(doc, s)}${constraints(s) ? ` · ${constraints(s)}` : ""}</p>`;
      // Enum descriptions that are bullet lists of the values are already shown elsewhere.
      const desc = values && Object.keys(bullets(s.description)).length ? s.description.split("\n")[0] : s.description;
      return `<div class="schema"><h3 id="schema-${name}"><code>${name}</code></h3>${md(desc)}${shape}</div>`;
    })
    .join("");

  return `
<section class="doc-intro">
  <p class="kicker">API reference · v${esc(version)}</p>
  <h1>${esc(doc.info.title)}</h1>
  <p class="lede">${inline(doc.info.summary || "")}</p>
  <p>This page is generated from the API's OpenAPI ${esc(doc.openapi)} contract, which the API's own tests check against the server. Download it as <a href="/docs/openapi.yaml">openapi.yaml</a> to generate clients and types. New to AudioKit? Start with <a href="/docs/">Get started</a>.</p>
</section>

<section>
  <h2 id="basics">Basics</h2>
  <div class="table-box"><table class="fields no-head"><tbody>
    <tr><td>Base URL</td><td class="mono">${base}</td></tr>
    <tr><td>Authentication</td><td class="soft">${md(doc.components.securitySchemes?.apiKey?.description)}<p>Send it as <code>Authorization: Bearer &lt;api key&gt;</code>.</p></td></tr>
    <tr><td>Errors</td><td class="soft"><p>Refused requests return ${schemaLink("Error")}: <code>{"error": {"code": "…", "message": "…"}}</code>. Failed jobs carry a ${schemaLink("JobError")}. New codes may be added: treat a code you don't recognise as <code>internal</code>.</p></td></tr>
  </tbody></table></div>
  ${config.apiBaseUrlIsPlaceholder ? `<p class="note">The base URL above is a placeholder. Use the one that comes with your API key.</p>` : ""}
</section>

<section>
  <h2 id="endpoints">Endpoints</h2>
  ${endpoints.join("")}
</section>

<section>
  <h2 id="operations">Operations</h2>
  <p>Set <code>operation</code> in the job request to one of these. <a href="#op-getCapabilities"><code>GET /v1/capabilities</code></a> lists the ones the server can run right now; others are refused with <code>422 operation_unavailable</code>. Params are checked strictly: unknown keys are a <code>422</code>.</p>
  ${operations}
</section>

<section>
  <h2 id="webhooks">Webhook</h2>
  ${hook.join("")}
</section>

<section>
  <h2 id="errors">Errors</h2>
  <h3 id="errors-api">Request errors</h3>
  <p>Returned with a 4xx or 5xx status when a request is refused.</p>
  <div class="table-box"><table class="fields"><thead><tr><th scope="col">Code</th><th scope="col">Status</th><th scope="col">Meaning</th></tr></thead><tbody>${apiErrorRows(doc).join("")}</tbody></table></div>
  <h3 id="errors-job">Job errors</h3>
  <p>In <code>error.code</code> of a job whose <code>status</code> is <code>failed</code>.</p>
  <div class="table-box"><table class="fields"><thead><tr><th scope="col">Code</th><th scope="col">Meaning</th></tr></thead><tbody>${jobErrorRows.join("")}</tbody></table></div>
</section>

<section>
  <h2 id="schemas">Schemas</h2>
  <p>Every schema in the contract, in its order.</p>
  <div class="schemas">${schemas}</div>
</section>`;
}
