#!/usr/bin/env bun
import solidPlugin from "@opentui/solid/bun-plugin";
import { renameSync } from "node:fs";

console.log("Building Calyx CLI...");

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  plugins: [solidPlugin],
  external: [
    "@opentui/core",
    "@opentui/solid",
    "solid-js",
    "solid-js/web",
    "solid-js/store",
  ],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("✅ Build complete! Output: ./dist/index.js");
