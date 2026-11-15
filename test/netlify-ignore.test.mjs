// The audiokit and audiokit-console Netlify sites both build from this repo, and before
// EPSILON-169 every push to main rebuilt both. Each build's `ignore` command now skips the site
// when none of its own inputs changed (each production deploy costs 15 Free-plan credits). A wrong
// rule fails silently, so this runs the real commands against a throwaway git repo, the same way
// test/storybook-site.test.mjs checks the Storybook site's rule.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// TOML basic strings use the same escapes as JSON strings, so JSON.parse reads the value.
function ignoreOf(path) {
  const toml = readFileSync(new URL(path, import.meta.url), "utf8");
  const match = toml.match(/^\s*ignore\s*=\s*("(?:[^"\\]|\\.)*")/m);
  assert.ok(match, `${path} has an ignore command`);
  return JSON.parse(match[1]);
}

const sites = {
  // The static site's base directory is the repo root.
  audiokit: { ignore: ignoreOf("../netlify.toml"), base: "." },
  // The console's base directory is console/.
  "audiokit-console": { ignore: ignoreOf("../console/netlify.toml"), base: "console" },
};

const GIT_LOCATION_VARS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
];

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

// Exit 0 skips the build.
function runIgnore(ignore, { cached, current, cwd }) {
  const refs = { CACHED_COMMIT_REF: cached, COMMIT_REF: current };
  for (const key of Object.keys(refs)) if (refs[key] === undefined) delete refs[key];
  return spawnSync("sh", ["-c", ignore], {
    cwd,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...refs },
    encoding: "utf8",
  }).status;
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "netlify-ignore-"));
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
    "src/pages/index.html",
    "src/static/styles.css",
    "scripts/build.mjs",
    "contract/openapi.yaml",
    "site.config.mjs",
    "netlify.toml",
    "package.json",
    "package-lock.json",
    "test/a.test.mjs",
    "docs/notes.md",
    "README.md",
    ".github/workflows/ci.yml",
    "console/src/routes/+page.svelte",
    "console/static/theme-init.js",
    "console/package.json",
    "console/netlify.toml",
    "console/README.md",
    "storybook-site/netlify.toml",
  ])
    write(file, "v1\n");
  commit("base");
  const changed = (rel) => {
    write(rel, `${Math.random()}\n`);
    return commit(rel);
  };
  return { root, git, changed };
}

const expectations = {
  audiokit: {
    builds: [
      "src/pages/index.html",
      "src/static/styles.css",
      "scripts/build.mjs",
      "contract/openapi.yaml",
      "site.config.mjs",
      "netlify.toml",
      "package.json",
      "package-lock.json",
    ],
    skips: [
      "console/src/routes/+page.svelte",
      "console/static/theme-init.js",
      "console/package.json",
      "console/netlify.toml",
      "storybook-site/netlify.toml",
      "docs/notes.md",
      "test/a.test.mjs",
      ".github/workflows/ci.yml",
    ],
  },
  "audiokit-console": {
    builds: [
      "console/src/routes/+page.svelte",
      "console/static/theme-init.js",
      "console/package.json",
      "console/netlify.toml",
      "console/README.md",
      "contract/openapi.yaml",
    ],
    skips: [
      "src/pages/index.html",
      "src/static/styles.css",
      "scripts/build.mjs",
      "site.config.mjs",
      "netlify.toml",
      "package.json",
      "storybook-site/netlify.toml",
      "docs/notes.md",
      "test/a.test.mjs",
    ],
  },
};

for (const [name, site] of Object.entries(sites)) {
  test(`${name}: builds for its own inputs, skips the rest, and builds when uncached`, () => {
    const { root, git, changed } = fixture();
    try {
      const cwd = join(root, site.base);
      for (const rel of expectations[name].skips) {
        const from = git("rev-parse", "HEAD");
        assert.equal(runIgnore(site.ignore, { cached: from, current: changed(rel), cwd }), 0, `skips ${rel}`);
      }
      for (const rel of expectations[name].builds) {
        const from = git("rev-parse", "HEAD");
        assert.notEqual(runIgnore(site.ignore, { cached: from, current: changed(rel), cwd }), 0, `builds ${rel}`);
      }
      // A change to its inputs anywhere in a range of commits builds.
      const start = git("rev-parse", "HEAD");
      changed(expectations[name].builds[0]);
      const end = changed(expectations[name].skips[0]);
      assert.notEqual(runIgnore(site.ignore, { cached: start, current: end, cwd }), 0, "range");

      const head = git("rev-parse", "HEAD");
      assert.notEqual(runIgnore(site.ignore, { cached: head, current: head, cwd }), 0, "equal refs");
      assert.notEqual(runIgnore(site.ignore, { cached: undefined, current: head, cwd }), 0, "cached ref missing");
      assert.notEqual(runIgnore(site.ignore, { cached: "", current: head, cwd }), 0, "cached ref empty");
      assert.notEqual(runIgnore(site.ignore, { cached: undefined, current: undefined, cwd }), 0, "both missing");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
