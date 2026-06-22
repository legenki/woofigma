# Full-fidelity snapshot — design

**Date:** 2026-06-22
**Package:** `apps/plugin` (`bookmarklet/snapshot.js` + tests; extension bundle rebuilt; plugin/converter unchanged)
**Status:** Approved, pending implementation

## Problem (diagnosed)

The snapshot must survive re-rendering in the plugin's iframe **identically** to
the original page, because the converter reads geometry from
`getBoundingClientRect` on the re-rendered DOM (`converter/dom.ts`,
`frame/converter.ts`). If the re-rendered layout differs, every measured position
and size is wrong → the Figma copy is misaligned/collapsed.

Today `inlineStyles` inlines only the ~55 properties the converter reads directly
(`SNAPSHOT_STYLE_PROPS`) and **drops the layout-driving ones** — `width`,
`height`, `margin*`, `gap`, `flex-direction`, `justify-content`, `align-items`,
`grid-*`, `position` offsets, `transform`, `border-radius`, … . Verified: of those,
only `display` is kept. So a re-rendered flex container loses its direction, gaps,
and child sizes → collapsed layout → inaccurate copy.

This whitelist was scoped for compactness (removing 404 noise). The goal now is
fidelity, which reverses that trade-off.

## Solution

Inline **all** computed properties of each element, minus a small **blacklist**
of properties that break re-rendering or are pure noise.

### Blacklist (`SNAPSHOT_SKIP_PROPS`)

- `content` — would inject `none`/string values, corrupting elements and text.
- `cursor` — pure noise; the converter ignores it.
- `will-change` — perf hint only, no visual.
- `contain`, `content-visibility` — can skip/hide rendering
  (`content-visibility: auto` collapses offscreen content).
- `inline-size`, `block-size` — logical duplicates of `width`/`height` that can
  double-constrain the box.
- `animation`, `animation-*`, `transition`, `transition-*` — may re-trigger
  animations / cause reflow on re-render.

Everything else is inlined, including vendor `-webkit-*` properties (some carry
real visuals, e.g. `-webkit-background-clip`).

### `inlineStyles` change

Replace the fixed-list loop with iteration over the computed-style declaration
itself. `getComputedStyle(el)` returns a `CSSStyleDeclaration` that is indexable:
`style.length` + `style[i]` enumerate the property names; `getPropertyValue(name)`
reads values. New loop:

```js
const computed = getStyle(original); // CSSStyleDeclaration-like
const decls = [];
for (let i = 0; i < computed.length; i += 1) {
  const prop = computed[i];
  if (SNAPSHOT_SKIP_PROPS.has(prop)) {
    continue;
  }
  const value = computed.getPropertyValue(prop);
  if (value) {
    decls.push(`${prop}: ${value}`);
  }
}
```

`SNAPSHOT_STYLE_PROPS` (the whitelist) is **removed**; `SNAPSHOT_SKIP_PROPS`
(a `Set`) replaces it. `buildSnapshotHtml`, `runSnapshot`, and the extension entry
keep their signatures.

## Guard test — reframed

The old guard asserted `converterReadProps ⊆ SNAPSHOT_STYLE_PROPS` (the snapshot
captures at least what the converter reads). Now the snapshot captures
*everything* except the blacklist, so the invariant flips:

> No property the converter reads may appear in `SNAPSHOT_SKIP_PROPS` — otherwise
> the snapshot would drop something the converter needs.

The test (`snapshot-whitelist.test.ts`, renamed conceptually but kept as the same
file) reuses the existing converter-prop extraction and asserts
`converterReadProps ∩ SNAPSHOT_SKIP_PROPS === ∅`. (Sanity: none of the blacklist
entries are in the converter's read set today — `display`/`width`/etc. are not
blacklisted; `cursor`/`content` etc. aren't read by the converter.)

## DI / test-stub shape

`inlineStyles` now needs the injected `getStyle(el)` to return an **iterable**
declaration (indexable + `length` + `getPropertyValue`), not just
`getPropertyValue`. The test stub changes from `{ getPropertyValue }` to an object
exposing a property list:

```ts
function makeStyle(map: Record<string, string>) {
  const keys = Object.keys(map);
  const decl: Record<string, unknown> = {
    length: keys.length,
    getPropertyValue: (p: string) => map[p] ?? "",
  };
  keys.forEach((k, i) => {
    decl[i] = k;
  });
  return decl;
}
```

The real bookmarklet/extension path passes `window.getComputedStyle(el)`, which is
already such a declaration — no change there.

## Files

- `apps/plugin/bookmarklet/snapshot.js` — replace whitelist with blacklist; new
  `inlineStyles` loop.
- `apps/plugin/bookmarklet/snapshot.test.ts` — update the stub to the iterable
  form; assert a layout prop (`width`) is inlined and a blacklist prop (`content`)
  is not.
- `apps/plugin/bookmarklet/snapshot-whitelist.test.ts` — flip to the
  intersection-empty invariant.
- `apps/plugin/bookmarklet/snapshot.bookmarklet.txt` — regenerate
  (`node apps/plugin/bookmarklet/build.mjs`).
- `apps/plugin/extension/content.js` — regenerate
  (`node apps/plugin/extension/build-extension.mjs`).
- `apps/plugin/bookmarklet/README.md` + `apps/plugin/extension/README.md` — note
  that all styles (minus a small blacklist) are inlined and snapshots are large.

Plugin UI, converter, manifest, background worker: **unchanged**.

## Testing

`snapshot.test.ts` (happy-dom + DI iterable stub):

1. A non-blacklisted property (`width: 100px`, `gap: 20px`) is inlined onto the
   element's `style`.
2. A blacklisted property (`content`, `cursor`) is **not** inlined.
3. `<script>`/`<noscript>` stripped; doctype present; shadow host doesn't throw
   (existing cases, updated stub).

`snapshot-whitelist.test.ts`:

4. Converter-read props ∩ `SNAPSHOT_SKIP_PROPS` is empty.

## Out of scope

- Shadow DOM, pseudo-elements, canvas/video/cross-origin iframe (still
  documented limitations — unaffected by this change).
- Converter-side geometry/auto-layout heuristics (unchanged; this only makes the
  re-render faithful so the converter measures correctly).
- Reducing snapshot size (deliberately traded away for fidelity).
