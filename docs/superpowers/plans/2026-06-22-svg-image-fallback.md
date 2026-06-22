# Restore `<img>` fallback for SVG decode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SVG (and any image `createImageBitmap` can't decode) transcode to PNG by falling back to the `<img>`+canvas decoder, instead of failing with `InvalidStateError`.

**Architecture:** `convertToPng` tries `createImageBitmap` first (robust raster path) and, on failure, falls back to loading the blob as an object-URL `<img>` and drawing it onto a canvas. Both paths share a `canvasToPngBytes` encode helper. Verified in chromium: SVG fails `createImageBitmap` but renders via `<img>`.

**Tech Stack:** TypeScript, Vitest browser project (Playwright chromium + canvas + `<img>`).

---

## File Structure

- **Modify** `packages/dom-to-figma/src/converter/nodes/image/loader.ts` — rewrite `convertToPng` to bitmap-then-`<img>`; add `decodeViaBitmap`, `decodeViaImg`, `canvasToPngBytes`.
- **Modify** `packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts` — add the SVG-transcodes test.

---

## Task 1: `<img>` fallback in `convertToPng`

**Files:**
- Modify: `packages/dom-to-figma/src/converter/nodes/image/loader.ts`
- Test: `packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts`
(it already imports `decodeImageBytes, processImageFile, sha1Bytes` and has the
`afterEach` unstub). Append this describe:

```ts
describe("convertToPng SVG fallback", () => {
  it("transcodes an SVG (createImageBitmap can't, <img> can)", async () => {
    const svg =
      "data:image/svg+xml;base64," +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>'
      );
    const file = await decodeImageBytes(svg);
    const info = await processImageFile(file);
    expect(info.bytes.slice(0, 4)).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(info.bytes.length).toBeGreaterThan(8);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @woofigma/dom-to-figma exec vitest run --project browser loader.browser.test.ts`
Expected: FAIL — `processImageFile` on the SVG rejects with `InvalidStateError`
(createImageBitmap can't decode SVG, and there's no fallback yet).

- [ ] **Step 3: Rewrite `convertToPng` with the `<img>` fallback**

In `packages/dom-to-figma/src/converter/nodes/image/loader.ts`, replace the
current `convertToPng` (the `createImageBitmap`-only version) with:

```ts
async function convertToPng(file: ImageFile): Promise<ArrayBuffer> {
  const blob = new Blob([file.bytes], { type: file.mimeType });
  try {
    return await decodeViaBitmap(blob);
  } catch {
    // createImageBitmap can't decode SVG (and some other sources); the <img>
    // path rasterizes anything the browser can render. Throws if it also fails.
    return await decodeViaImg(blob);
  }
}

async function decodeViaBitmap(blob: Blob): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas for PNG conversion");
    }
    ctx.drawImage(bitmap, 0, 0);
    return await canvasToPngBytes(canvas);
  } finally {
    bitmap.close();
  }
}

async function decodeViaImg(blob: Blob): Promise<ArrayBuffer> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas for PNG conversion");
    }
    ctx.drawImage(img, 0, 0);
    return await canvasToPngBytes(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const pngBlob = await canvasToBlob(canvas, "image/png", PNG_QUALITY);
  return pngBlob.arrayBuffer();
}
```

(Keep the existing `canvasToBlob`, `PNG_QUALITY`, `sha1Bytes`, `sha1`,
`processImageFile`, `decodeImageBytes`, etc. — only `convertToPng` is replaced and
these helpers are added.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @woofigma/dom-to-figma exec vitest run --project browser loader.browser.test.ts`
Expected: PASS — the SVG now transcodes to PNG via the `<img>` fallback; the webp
test (bitmap path) still passes; the garbage test still rejects (both paths fail).

- [ ] **Step 5: Typecheck + the package's browser suite (no regression)**

Run: `pnpm --filter @woofigma/dom-to-figma check-types && pnpm --filter @woofigma/dom-to-figma exec vitest run --project browser`
Expected: PASS.

- [ ] **Step 6: Format + commit**

```bash
pnpm exec biome check --write packages/dom-to-figma/src/converter/nodes/image/loader.ts packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts
git add packages/dom-to-figma/src/converter/nodes/image/loader.ts packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts
git commit -m "fix(dom-to-figma): fall back to <img> decode so SVG images transcode"
```

---

## Self-Review

- **Spec coverage:** bitmap-then-`<img>` fallback in `convertToPng` (Step 3) ✓;
  re-added `loadImageElement` + `<img>` canvas path (Step 3) ✓; shared
  `canvasToPngBytes` (Step 3) ✓; both-fail → throw → per-paint skip preserved
  (the `decodeViaImg` rejects on `onerror`, propagating) ✓; SVG-transcodes test
  (Step 1), webp-still-works + garbage-rejects (existing) ✓; converter walkers /
  plugin / snapshot untouched ✓.
- **Placeholders:** none — full code; the SVG fixture is inline.
- **Type consistency:** `convertToPng(file: ImageFile): Promise<ArrayBuffer>`
  signature unchanged (callers unaffected). `decodeViaBitmap`/`decodeViaImg`
  return `Promise<ArrayBuffer>`; `canvasToPngBytes(canvas): Promise<ArrayBuffer>`
  wraps the existing `canvasToBlob`. `loadImageElement` re-added with the same
  shape it had before commit 46f5bfe.
- **Garbage test still valid:** the existing "rejects on garbage image bytes"
  test passes a 4-byte `image/avif` payload — `createImageBitmap` rejects, then
  `<img>` `onerror` rejects too, so `convertToPng` still throws and
  `processImageFile` rejects. No change needed to that test.
- **Test env:** browser project (Playwright chromium has `<img>`, canvas,
  `createImageBitmap`), where the image tests already live.