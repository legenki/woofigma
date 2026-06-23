# Chrome MV3 snapshot extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Manifest V3 Chrome extension whose toolbar icon injects the existing snapshot logic into the active tab, capturing the live DOM the same way the bookmarklet does.

**Architecture:** A static MV3 manifest + a ~5-line background service worker (`chrome.action.onClicked` → `chrome.scripting.executeScript({files:["content.js"]})`). `content.js` is an esbuild bundle of a thin `content-entry.js` that imports and calls `runSnapshot` from the shared `apps/plugin/bookmarklet/snapshot.js` — zero duplicated capture/delivery logic. The build reuses the bookmarklet's esbuild-resolution pattern and is wrapped in an exported function so a node test can smoke-check the bundle.

**Tech Stack:** Chrome MV3, esbuild (from the pnpm store), Vitest (node). The snapshot logic and its tests already exist and are reused.

---

## File Structure

- **Create** `apps/plugin/extension/manifest.json` — static MV3 manifest.
- **Create** `apps/plugin/extension/background.js` — service worker (onClicked → executeScript).
- **Create** `apps/plugin/extension/content-entry.js` — thin entry: `import { runSnapshot } from "../bookmarklet/snapshot.js"; runSnapshot();`.
- **Create** `apps/plugin/extension/build-extension.mjs` — exports `buildExtension()` (esbuild bundle of `content-entry.js` → `content.js`), runs on direct invoke.
- **Generated** `apps/plugin/extension/content.js` — committed bundle output.
- **Create** `apps/plugin/extension/extension-build.test.ts` — node smoke test: run `buildExtension()`, assert `content.js` contains the snapshot marker.
- **Create** `apps/plugin/extension/icon.png` — toolbar icon (one PNG reused at 16/48/128).
- **Create** `apps/plugin/extension/README.md` — Load-unpacked instructions.
- `apps/plugin/bookmarklet/snapshot.js` — **unchanged** (reused).

Order: build script + bundle + smoke test first (Task 1, the testable core) → manifest + background + icon (Task 2, static glue) → README (Task 3).

---

## Task 1: build script, content bundle, and smoke test

**Files:**
- Create: `apps/plugin/extension/content-entry.js`
- Create: `apps/plugin/extension/build-extension.mjs`
- Create: `apps/plugin/extension/extension-build.test.ts`
- Generated: `apps/plugin/extension/content.js`

- [ ] **Step 1: Create the thin content entry**

Create `apps/plugin/extension/content-entry.js`:

```js
// Chrome extension content-script entry. Runs in the active tab (isolated world,
// shared DOM) when the toolbar icon is clicked. Reuses the same capture +
// delivery logic as the bookmarklet — no duplicated code.
import { runSnapshot } from "../bookmarklet/snapshot.js";

runSnapshot();
```

- [ ] **Step 2: Create the build script (exported + runnable)**

Create `apps/plugin/extension/build-extension.mjs`:

```js
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
```

- [ ] **Step 3: Write the failing smoke test**

Create `apps/plugin/extension/extension-build.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildExtension } from "./build-extension.mjs";

const CONTENT_JS = join(import.meta.dirname, "content.js");

beforeAll(async () => {
  await buildExtension();
});

describe("extension content bundle", () => {
  it("writes content.js", () => {
    expect(existsSync(CONTENT_JS)).toBe(true);
  });

  it("bundles the snapshot delivery logic", () => {
    const text = readFileSync(CONTENT_JS, "utf8");
    // The download filename is a stable marker that runSnapshot is wired in.
    expect(text).toContain("wooframe-snapshot.html");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter plugin exec vitest run extension-build.test.ts`
Expected: FAIL — `./build-extension.mjs` / `buildExtension` not found (file not created yet, or `content.js` absent before the build runs).

Note: the vitest glob already includes `bookmarklet/**/*.test.ts` but not
`extension/`. The next step fixes that.

- [ ] **Step 5: Extend the vitest glob to include `extension/`**

In `apps/plugin/vitest.config.ts`, add the extension test glob:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "bookmarklet/**/*.test.ts",
      "extension/**/*.test.ts",
    ],
    environment: "node",
  },
});
```

- [ ] **Step 6: Generate the bundle and run the test to verify it passes**

Run: `node apps/plugin/extension/build-extension.mjs && pnpm --filter plugin exec vitest run extension-build.test.ts`
Expected: `Wrote apps/plugin/extension/content.js`, then PASS (2 tests).

- [ ] **Step 7: Format + commit**

```bash
pnpm exec biome check --write apps/plugin/extension/content-entry.js apps/plugin/extension/build-extension.mjs apps/plugin/extension/extension-build.test.ts
git add apps/plugin/extension/content-entry.js apps/plugin/extension/build-extension.mjs apps/plugin/extension/extension-build.test.ts apps/plugin/extension/content.js apps/plugin/vitest.config.ts
git commit -m "feat(plugin): chrome extension content bundle + build smoke test"
```

---

## Task 2: manifest, background worker, and icon

**Files:**
- Create: `apps/plugin/extension/manifest.json`
- Create: `apps/plugin/extension/background.js`
- Create: `apps/plugin/extension/icon.png`

- [ ] **Step 1: Create the background service worker**

Create `apps/plugin/extension/background.js`:

```js
// On toolbar-icon click, inject the bundled content script into the active tab.
// activeTab grants single-tab access for this click only; no broad host perms.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) {
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});
```

- [ ] **Step 2: Create the manifest**

Create `apps/plugin/extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "wooFrame Snapshot",
  "version": "0.0.1",
  "description": "Capture the current page's rendered DOM as an .html snapshot for the wooFrame Figma plugin.",
  "permissions": ["activeTab", "scripting"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "wooFrame snapshot",
    "default_icon": {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  "icons": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
}
```

- [ ] **Step 3: Generate a simple icon**

Run this to write a solid Figma-blue 128×128 PNG (no extra deps — uses zlib +
a hand-built PNG):

```bash
node -e '
const z=require("zlib");
const W=128,H=128;
// RGBA raw with a 1-byte filter (0) per row
const row=Buffer.alloc(1+W*4);
row[0]=0;
for(let x=0;x<W;x++){const o=1+x*4;row[o]=13;row[o+1]=153;row[o+2]=255;row[o+3]=255;}
const raw=Buffer.concat(Array.from({length:H},()=>row));
const idat=z.deflateSync(raw);
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data]))>>>0);return Buffer.concat([len,t,data,crc]);}
function crc32(buf){let c=~0;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return ~c;}
const sig=Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([sig,chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);
require("fs").writeFileSync("apps/plugin/extension/icon.png",png);
console.log("wrote icon.png",png.length,"bytes");
'
```

Expected: `wrote icon.png <N> bytes`.

- [ ] **Step 4: Validate the manifest JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/plugin/extension/manifest.json','utf8')); console.log('manifest ok')"`
Expected: `manifest ok`.

- [ ] **Step 5: Commit**

```bash
git add apps/plugin/extension/manifest.json apps/plugin/extension/background.js apps/plugin/extension/icon.png
git commit -m "feat(plugin): chrome extension manifest, background worker, icon"
```

---

## Task 3: extension README

**Files:**
- Create: `apps/plugin/extension/README.md`

- [ ] **Step 1: Write the README**

Create `apps/plugin/extension/README.md`:

```markdown
# wooFrame Snapshot — Chrome extension

A toolbar-icon version of the snapshot bookmarklet. Click the icon on any page to
capture its live, rendered DOM (in your own session) as a `wooframe-snapshot.html`
you drop into the wooFrame Figma plugin. Same capture logic as the bookmarklet —
this just trades the bookmark for a toolbar button.

## Build

```bash
node apps/plugin/extension/build-extension.mjs
```

This regenerates `content.js` from the shared `../bookmarklet/snapshot.js`.

## Install (unpacked)

1. Build (above) so `content.js` exists.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the `apps/plugin/extension/` folder.

The **wooFrame Snapshot** icon appears in the toolbar.

## Use

1. Navigate to the page you want to import.
2. Click the **wooFrame Snapshot** toolbar icon.
3. A toast shows progress; a `wooframe-snapshot.html` downloads (and is copied to
   the clipboard if the browser allows).
4. In Figma, run the plugin and drop the `.html` onto the drop zone (or Cmd+V).

## What it captures / limits

Identical to the bookmarklet (see `../bookmarklet/README.md`): the live DOM with
the converter's CSS properties inlined, scripts stripped. Not captured: Shadow
DOM, `<canvas>`/WebGL, `<video>`, cross-origin `<iframe>`, pseudo-elements.

The extension uses only the `activeTab` and `scripting` permissions — it can read
the current tab only when you click the icon, and never runs in the background.

A one-click Chrome Web Store install would require publishing (developer account
+ Google review) and is out of scope; Load unpacked is the supported path.
```

- [ ] **Step 2: Commit**

```bash
git add apps/plugin/extension/README.md
git commit -m "docs: chrome extension install/use instructions"
```

---

## Self-Review

- **Spec coverage:** manifest MV3 + activeTab/scripting + action + icons (Task 2)
  ✓; background onClicked → executeScript (Task 2) ✓; content-entry importing
  `runSnapshot` from shared snapshot.js (Task 1) ✓; esbuild bundle reusing the
  resolution pattern (Task 1) ✓; build smoke test asserting the bundle wires the
  snapshot logic (Task 1) ✓; icons 16/48/128 from one PNG (Task 2) ✓; README /
  Load-unpacked (Task 3) ✓; snapshot.js unchanged (no task touches it) ✓; vitest
  glob extended for `extension/` (Task 1 Step 5) ✓.
- **Placeholders:** none — all code concrete, including the icon generator and
  the manifest.
- **Type/name consistency:** `buildExtension()` exported in Task 1 Step 2 and
  imported in the test (Step 3) and README (Task 3). `content.js` is the
  executeScript `files` target (Task 2) and the build output (Task 1) — same
  name. `runSnapshot` is the existing export from `snapshot.js` (verified) that
  `content-entry.js` imports.
- **Typecheck scope (intentional, same as bookmarklet):** `extension/*.js` and
  `*.mjs` are plain-JS artifacts outside the plugin tsconfig `include` (`["src",
  …]`); they're covered by the build smoke test under vitest, not tsc. The
  `.test.ts` runs under vitest's node project.
- **No host_permissions:** deliberately omitted — `activeTab` is sufficient and
  minimal, matching the spec.
