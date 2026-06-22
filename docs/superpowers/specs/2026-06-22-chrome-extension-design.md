# Chrome extension (snapshot) — design

**Date:** 2026-06-22
**Package:** `apps/plugin` (new `extension/` artifact; plugin + bookmarklet logic unchanged)
**Status:** Approved, pending implementation

## Summary

Replace "find and click the bookmarklet" with "click a toolbar icon." An MV3
Chrome extension injects the existing snapshot logic into the active tab on icon
click. The capture logic (`buildSnapshotHtml` / `runSnapshot`) is the **same**
`apps/plugin/bookmarklet/snapshot.js` used by the bookmarklet — the extension is
just a different delivery shell.

The bookmarklet stays as a browser-agnostic fallback. Delivery into Figma
(drop `.html` / Cmd+V) is unchanged — the extension simplifies *triggering*, not
the cross-process hand-off to Figma (which is irreducible).

## Verified constraints

- **MV3 trigger:** `chrome.action.onClicked` (toolbar icon) →
  `chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] })`.
  Requires `permissions: ["activeTab", "scripting"]`. `activeTab` grants
  single-tab access **on click only** — minimal privilege, no broad
  `host_permissions`.
- **Isolated world:** `executeScript` runs the content script in the default
  *isolated world*. That is sufficient and correct here: `buildSnapshotHtml`
  touches only the **DOM** and `getComputedStyle`, never page-script globals. The
  isolated world shares the page's **DOM** (only the JS scope is isolated), so
  the toast elements and `cloneNode`/`querySelectorAll` work exactly as in the
  bookmarklet.
- **Clipboard:** `navigator.clipboard.writeText` works from a content script
  because the icon click is a user gesture. (`runSnapshot` already treats it as
  best-effort.)

## Architecture (units & boundaries)

- **`apps/plugin/extension/manifest.json`** — static MV3 manifest:
  `manifest_version: 3`, `action` (toolbar icon, no popup), `background.service_
  worker: "background.js"` (`type: "module"` not needed — background is plain),
  `permissions: ["activeTab", "scripting"]`, `icons` 16/48/128.
- **`apps/plugin/extension/background.js`** — service worker, ~5 lines:
  `chrome.action.onClicked.addListener((tab) => chrome.scripting.executeScript({
  target: { tabId: tab.id }, files: ["content.js"] }))`.
- **`apps/plugin/extension/content.js`** — **generated** bundle: esbuild bundles
  a thin entry that imports and calls `runSnapshot` from the shared
  `snapshot.js`. Runs in the page (isolated world) → sees the live DOM + session.
- **`apps/plugin/extension/content-entry.js`** — the thin entry (source):
  `import { runSnapshot } from "../bookmarklet/snapshot.js"; runSnapshot();`.
- **`apps/plugin/extension/icon.png`** (16/48/128) — toolbar icons (generated
  simple placeholder).
- **`apps/plugin/extension/README.md`** — how to Load unpacked.

`apps/plugin/bookmarklet/snapshot.js` is **unchanged** — single source of capture
+ delivery logic (`buildSnapshotHtml`, `runSnapshot`) for both the bookmarklet
and the extension. No duplicated delivery code; `content-entry.js` is just
`runSnapshot()`.

## Build

Reuse esbuild (as `build.mjs` does). A `build-extension.mjs` bundles
`content-entry.js` → `extension/content.js` (IIFE, minified). The bookmarklet's
`build.mjs` and this script share the esbuild-resolution pattern. `manifest.json`
/ `background.js` / icons are static (committed as-is).

## Install & use

1. Build: `node apps/plugin/extension/build-extension.mjs` (generates
   `content.js`).
2. `chrome://extensions` → enable Developer mode → **Load unpacked** → select
   `apps/plugin/extension/`.
3. On any page, click the **Woofigma Snapshot** toolbar icon → toast → a
   `woofigma-snapshot.html` downloads (and is copied to clipboard).
4. Drop the `.html` into the plugin (or Cmd+V).

One-click install from the Chrome Web Store (vs. Load unpacked) would require
publishing (developer account + Google review) — out of scope.

## Testing

- `buildSnapshotHtml` / `runSnapshot` are already covered by the bookmarklet's
  `snapshot.test.ts` (reused, not re-tested).
- **Build smoke test** (`extension-build.test.ts`, node): run the extension
  build, then assert `extension/content.js` exists and its text contains a marker
  proving the bundle includes the snapshot logic (e.g. the
  `"woofigma-snapshot.html"` download filename string). Guards that the bundle
  actually wires `runSnapshot` in.
- `manifest.json` / `background.js` are not unit-tested (trivial; verified by
  manual Load unpacked).

## Out of scope

- Auto-capture on tab load, network interception, storage — would need more than
  `activeTab` (deliberately not added).
- Chrome Web Store publishing.
- Firefox/other-browser extension packaging (the bookmarklet already covers
  other browsers).
- Any change to the Figma plugin UI or the converter.
