# Fix image processing in the Figma iframe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make images import in the Figma plugin iframe by replacing the `crypto.subtle.digest` SHA-1 (unavailable there) with a pure-JS SHA-1, so decoded images stop dying at the hash step; undecodable images (AVIF) stay isolated per-image.

**Architecture:** Add a self-contained `sha1Bytes(bytes)` pure-JS SHA-1 in `image/loader.ts` that returns the same 20-byte `Array<number>` the old `crypto.subtle` path returned (clipboard hash format unchanged). `sha1` becomes a thin wrapper. No other behavior changes; `convertToPng` already rejects on undecodable images and the callers already skip them.

**Tech Stack:** TypeScript, Vitest (the package's browser project, where the image tests already live). Pure-JS SHA-1 — no Web Crypto, no deps.

---

## File Structure

- **Modify** `packages/dom-to-figma/src/converter/nodes/image/loader.ts` — add `sha1Bytes`; rewrite `sha1` to use it.
- **Modify** `packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts` — add the SHA-1 vector test, the no-`crypto.subtle` test, and the undecodable-image test.

---

## Task 1: Pure-JS SHA-1 for image hashing

**Files:**
- Modify: `packages/dom-to-figma/src/converter/nodes/image/loader.ts`
- Test: `packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts`
(it already imports `decodeImageBytes, processImageFile` and has `afterEach`
unstubbing globals). Add `sha1Bytes` to the import and append these describes:

```ts
import { sha1Bytes } from "./loader";

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("sha1Bytes", () => {
  it("matches the standard SHA-1 of 'abc'", () => {
    expect(sha1Bytes(utf8("abc"))).toEqual([
      0xa9, 0x99, 0x3e, 0x36, 0x47, 0x06, 0x81, 0x6a, 0xba, 0x3e, 0x25, 0x71,
      0x78, 0x50, 0xc2, 0x6c, 0x9c, 0xd0, 0xd8, 0x9d,
    ]);
  });

  it("hashes the empty input", () => {
    expect(sha1Bytes(utf8(""))).toEqual([
      0xda, 0x39, 0xa3, 0xee, 0x5e, 0x6b, 0x4b, 0x0d, 0x32, 0x55, 0xbf, 0xef,
      0x95, 0x60, 0x18, 0x90, 0xaf, 0xd8, 0x07, 0x09,
    ]);
  });
});

describe("processImageFile without crypto.subtle", () => {
  it("hashes a PNG even when crypto.subtle is undefined", async () => {
    // Reproduce the Figma iframe: no SubtleCrypto.
    vi.stubGlobal("crypto", {});
    const png = await decodeImageBytes(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    );
    const info = await processImageFile(png);
    expect(info.hash).toHaveLength(20);
    expect(info.bytes.slice(0, 4)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

describe("undecodable image isolation", () => {
  it("rejects (does not hang) on garbage image bytes", async () => {
    const garbage = {
      bytes: new Uint8Array([1, 2, 3, 4]).buffer,
      mimeType: "image/avif",
    };
    await expect(processImageFile(garbage)).rejects.toBeDefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @woofigma/dom-to-figma exec vitest run --project browser loader.browser.test.ts`
Expected: FAIL — `sha1Bytes` is not exported (and the no-crypto test would fail
against the current `crypto.subtle` implementation).

- [ ] **Step 3: Add `sha1Bytes` and rewrite `sha1`**

In `packages/dom-to-figma/src/converter/nodes/image/loader.ts`, replace the
existing `sha1` function (the `crypto.subtle.digest` one at the bottom) with a
pure-JS implementation:

```ts
/**
 * Pure-JS SHA-1 (FIPS 180-1). Returns the 20-byte digest as a number array —
 * the same shape the old crypto.subtle path returned. Used instead of
 * crypto.subtle.digest because SubtleCrypto is unavailable in the Figma plugin
 * iframe (not a secure context).
 */
export function sha1Bytes(input: Uint8Array): Array<number> {
  const ml = input.length * 8;
  // Pad: append 0x80, then zeros, then the 64-bit length, to a 512-bit multiple.
  const withOne = input.length + 1;
  const totalLen = withOne + ((64 - ((withOne + 8) % 64)) % 64) + 8;
  const msg = new Uint8Array(totalLen);
  msg.set(input);
  msg[input.length] = 0x80;
  // 64-bit big-endian length in the last 8 bytes (ml fits in 32 bits here).
  const dv = new DataView(msg.buffer);
  dv.setUint32(totalLen - 4, ml >>> 0, false);
  dv.setUint32(totalLen - 8, Math.floor(ml / 0x1_0000_0000), false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Int32Array(80);
  for (let chunk = 0; chunk < totalLen; chunk += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = dv.getInt32(chunk + i * 4, false);
    }
    for (let i = 16; i < 80; i += 1) {
      const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (v << 1) | (v >>> 31);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const out = new Array<number>(20);
  const words = [h0, h1, h2, h3, h4];
  for (let i = 0; i < 5; i += 1) {
    out[i * 4] = (words[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (words[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (words[i] >>> 8) & 0xff;
    out[i * 4 + 3] = words[i] & 0xff;
  }
  return out;
}

function sha1(buffer: ArrayBuffer): Array<number> {
  return sha1Bytes(new Uint8Array(buffer));
}
```

Then update the one caller in `processImageFile` — `sha1` is now synchronous, so
drop the `await`:

```ts
  const hash = sha1(finalBytes);
```

(The function stays `async` because of the `convertToPng` await; only the `sha1`
call loses its `await`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @woofigma/dom-to-figma exec vitest run --project browser loader.browser.test.ts`
Expected: PASS — SHA-1 vectors for `"abc"` and `""` match; `processImageFile`
hashes with `crypto` stubbed to `{}`; garbage rejects.

- [ ] **Step 5: Typecheck + the package's browser suite (no regression)**

Run: `pnpm --filter @woofigma/dom-to-figma check-types && pnpm --filter @woofigma/dom-to-figma exec vitest run --project browser`
Expected: PASS.

- [ ] **Step 6: Format + commit**

```bash
pnpm exec biome check --write packages/dom-to-figma/src/converter/nodes/image/loader.ts packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts
git add packages/dom-to-figma/src/converter/nodes/image/loader.ts packages/dom-to-figma/src/converter/nodes/image/loader.browser.test.ts
git commit -m "fix(dom-to-figma): hash images with a pure-JS SHA-1 (no crypto.subtle)"
```

---

## Self-Review

- **Spec coverage:** Fix A — pure-JS `sha1Bytes` returning a 20-byte
  `Array<number>`, `sha1` wraps it, `crypto.subtle` removed (Task 1 Step 3) ✓;
  Fix B — undecodable images already isolated (no code change needed; covered by
  the garbage-rejects test, Step 1) ✓; tests: SHA-1 vector, no-crypto.subtle,
  undecodable isolation (Step 1) ✓; converter walkers / plugin / snapshot
  untouched ✓.
- **Placeholders:** none — the full SHA-1 is implemented; the `"abc"`/`""`
  vectors are verified against `node:crypto`.
- **Type consistency:** `sha1Bytes(input: Uint8Array): Array<number>` defined and
  imported in the test; `sha1(buffer)` returns the same `Array<number>` shape the
  old `crypto.subtle` path returned, so `processImageFile`'s `hash` field type is
  unchanged. The only call-site change is dropping `await` before `sha1`.
- **Async note:** `processImageFile` stays `async` (it awaits `convertToPng`);
  only the `sha1` call drops `await`. No signature change.
- **Test env:** these run in the dom-to-figma **browser** project (where
  `decodeImageBytes`/`createImageBitmap` tests already live); `sha1Bytes` is pure
  and would pass in node too, but co-locating keeps one file.