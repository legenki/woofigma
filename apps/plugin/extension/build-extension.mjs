// Bundles content-entry.js (which pulls in the shared snapshot logic) into a
// single content.js for the MV3 extension.
// Run from the repo root: `node apps/plugin/extension/build-extension.mjs`
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// esbuild lives in the pnpm store but isn't exposed as a root bin; resolve it.
const esbuild = require(
  require.resolve("esbuild", {
    paths: [
      join(here, "../../../node_modules/.pnpm/esbuild@0.28.1/node_modules"),
    ],
  })
);

export async function buildExtension() {
  await esbuild.build({
    entryPoints: [join(here, "content-entry.js")],
    bundle: true,
    minify: true,
    format: "iife",
    outfile: join(here, "content.js"),
  });
}

// Run when invoked directly (not when imported by the test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildExtension();
  console.log("Wrote apps/plugin/extension/content.js");
}
