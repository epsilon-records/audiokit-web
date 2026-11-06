import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The console is a separate app from the static site in ../src. It is built and
  // deployed on its own (see README), so it must not be picked up by the site build.
  reactStrictMode: true,
  poweredByHeader: false,
  // The repo root has its own package-lock.json for the static site. Pin the
  // workspace root to this app so Next doesn't infer the parent directory.
  turbopack: { root: import.meta.dirname },
  // The console is served under /console on audiokit.ai. Keeping the prefix in the
  // app's own routes (app/console/*) means the same tree works if it later moves to
  // its own host, with only the base path changing.
  basePath: "",
};

export default nextConfig;
