// storybook-site/netlify.toml is the config for the storybook.audiokit.ai Netlify site
// (knowledge shared 0064, modelled on labelkit's). Its `ignore` command decides whether a deploy
// is built, and a wrong one fails silently: labelkit's first version skipped every uncached build,
// so its site never published. This runs the real command against a throwaway git repo.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const toml = readFileSync(new URL("../storybook-site/netlify.toml", import.meta.url), "utf8");
const HUB = "https://storybook.epsilonrecords.com";

// Git repository-location variables that would make a fixture git call act on the caller's repo.
const GIT_LOCATION_VARS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
];

// Environment for fixture git calls: no inherited repo location, and a fixed identity so commits
// do not depend on the caller's global git config.
function fixtureGitEnv() {
  const env = { ...process.env };
  for (const key of GIT_LOCATION_VARS) delete env[key];
  return {
    ...env,
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@example.com",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@example.com",
  };
}

// TOML basic strings use the same escapes as JSON strings, so JSON.parse reads the value.
const ignore = JSON.parse(toml.match(/^\s*ignore\s*=\s*("(?:[^"\\]|\\.)*")/m)[1]);

// `for = "<path>"` blocks and the header lines inside each.
function headerBlocks() {
  return toml.split("[[headers]]").slice(1).map((block) => ({
    path: block.match(/for\s*=\s*"([^"]+)"/)[1],
    headers: Object.fromEntries(
      [...block.matchAll(/^\s*([A-Za-z-]+)\s*=\s*"([^"]*)"/gm)]
        .filter(([, name]) => name !== "for")
        .map(([, name, value]) => [name, value]),
    ),
  }));
}

test("builds console/ into storybook-site/dist", () => {
  assert.match(toml, /^\s*publish\s*=\s*"dist"/m);
  assert.match(toml, /cd \.\.\/console && npm ci && npm run build-storybook/);
  assert.match(toml, /-o \.\.\/storybook-site\/dist/);
});

test("every path is noindex", () => {
  const all = headerBlocks().find((b) => b.path === "/*");
  assert.equal(all?.headers["X-Robots-Tag"], "noindex");
});

test("index.json and the static assets allow the hub origin", () => {
  const blocks = headerBlocks();
  for (const path of ["/index.json", "/assets/*"]) {
    const block = blocks.find((b) => b.path === path);
    assert.equal(block?.headers["Access-Control-Allow-Origin"], HUB, path);
  }
  for (const block of blocks) {
    const origin = block.headers["Access-Control-Allow-Origin"];
    assert.ok(origin === undefined || origin === HUB, `${block.path} must not be open to every origin`);
  }
});

// The ignore command runs in the site's base directory. Exit 0 skips the build.
function runIgnore({ cached, current, cwd, env = {} }) {
  const refs = { CACHED_COMMIT_REF: cached, COMMIT_REF: current };
  for (const key of Object.keys(refs)) if (refs[key] === undefined) delete refs[key];
  return spawnSync("sh", ["-c", ignore], {
    cwd,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...refs, ...env },
    encoding: "utf8",
  }).status;
}

test("ignore skips unrelated changes and builds for UI, Storybook or uncached", () => {
  const root = mkdtempSync(join(tmpdir(), "sb-ignore-"));
  try {
    const git = (...args) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8", env: fixtureGitEnv() }).trim();
    const write = (rel, text) => {
      mkdirSync(join(root, rel, ".."), { recursive: true });
      writeFileSync(join(root, rel), text);
    };
    const commit = (message) => {
      git("add", "-A");
      git("-c", "commit.gpgsign=false", "commit", "-q", "-m", message);
      return git("rev-parse", "HEAD");
    };

    git("init", "-q");
    for (const file of [
      "console/src/lib/a.ts",
      "console/src/stories/a.stories.svelte",
      "console/src/routes/page.ts",
      "console/.storybook/main.ts",
      "console/package.json",
      "console/package-lock.json",
      "console/README.md",
      "docs/notes.md",
      "storybook-site/netlify.toml",
    ]) write(file, "v1\n");
    const base = commit("base");
    const cwd = join(root, "storybook-site");

    const changed = (rel) => {
      write(rel, `${Math.random()}\n`);
      return commit(rel);
    };

    // Changes outside the UI and Storybook: skip.
    assert.equal(runIgnore({ cached: base, current: changed("console/src/routes/page.ts"), cwd }), 0);
    assert.equal(runIgnore({ cached: base, current: changed("docs/notes.md"), cwd }), 0);
    assert.equal(runIgnore({ cached: base, current: changed("console/README.md"), cwd }), 0);

    // Each UI or Storybook input builds.
    for (const rel of [
      "console/src/lib/a.ts",
      "console/src/stories/a.stories.svelte",
      "console/.storybook/main.ts",
      "console/package.json",
      "console/package-lock.json",
      "storybook-site/netlify.toml",
    ]) {
      const from = git("rev-parse", "HEAD");
      assert.notEqual(runIgnore({ cached: from, current: changed(rel), cwd }), 0, rel);
    }

    // An uncached build must build: refs equal, or the cached ref missing.
    const head = git("rev-parse", "HEAD");
    assert.notEqual(runIgnore({ cached: head, current: head, cwd }), 0, "equal refs");
    assert.notEqual(runIgnore({ cached: undefined, current: head, cwd }), 0, "cached ref missing");
    assert.notEqual(runIgnore({ cached: "", current: head, cwd }), 0, "cached ref empty");
    assert.notEqual(runIgnore({ cached: undefined, current: undefined, cwd }), 0, "both missing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
