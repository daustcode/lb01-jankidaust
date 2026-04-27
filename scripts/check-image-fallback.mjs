#!/usr/bin/env node
/**
 * Automated guard: ensure every image rendered in the app goes through the
 * <ImageFallback /> component, and that we never reintroduce skeleton /
 * shimmer placeholders on images.
 *
 * Failures here block the build (wired into `bun run lint`).
 *
 * Rules enforced:
 *   1. No raw `<img` JSX in src/ (except inside ImageFallback.tsx itself).
 *   2. No `animate-pulse` / `Skeleton` placeholder used as a wrapper for an
 *      <img> or for ImageFallback (skeletons are still allowed for tables /
 *      lists — this only flags image-shaped placeholders).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname;
const ALLOWLIST = new Set([
  // The one place a real <img> is allowed to live.
  "components/ImageFallback.tsx",
]);

/** @type {string[]} */
const errors = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry)) continue;
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;

    const text = readFileSync(full, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      // Rule 1: no raw <img tags
      if (/<img[\s/>]/.test(line)) {
        errors.push(
          `${rel}:${i + 1}  raw <img> is forbidden — use <ImageFallback />`,
        );
      }
      // Rule 2: image-shaped skeleton placeholders
      if (
        /animate-pulse/.test(line) &&
        /(rounded-full|aspect-square|w-\d+\s+h-\d+)/.test(line)
      ) {
        errors.push(
          `${rel}:${i + 1}  skeleton/shimmer placeholder on an image-shaped element is forbidden`,
        );
      }
    });
  }
}

walk(ROOT);

if (errors.length) {
  console.error("\n✗ image-fallback guard failed:\n");
  for (const e of errors) console.error("  " + e);
  console.error(`\n${errors.length} violation(s).`);
  process.exit(1);
}
console.log("✓ image-fallback guard passed");
