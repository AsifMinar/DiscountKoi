import type { NextConfig } from "next";

/**
 * GitHub Pages serves this site from https://asifminar.github.io/DiscountKoi/,
 * so every route and asset lives under /DiscountKoi. It must match the repository
 * name exactly (it's case-sensitive). Set PAGES_BASE_PATH="" if you ever move to a
 * custom domain.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "/DiscountKoi";

const nextConfig: NextConfig = {
  // Static HTML export: no server needed, so GitHub Pages can host it for free.
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // Emit /about/index.html instead of /about.html so GitHub Pages resolves clean URLs.
  trailingSlash: true,
  // The Next.js image optimizer needs a server, which a static export doesn't have.
  images: { unoptimized: true },
  // Lets client code build URLs to files in /public (e.g. deals.json) under the base path.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  experimental: {
    // The on-disk build cache once served a stale globals.css. Builds take seconds and CI
    // starts clean anyway, so always build fresh.
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
