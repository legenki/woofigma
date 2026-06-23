# Gradient direction in the plugin — design

**Date:** 2026-06-22
**Package:** `apps/plugin` (builder only; converter unchanged)
**Status:** Approved, pending implementation

## Problem (root cause, verified)

The converter already derives gradient direction. `gradient.ts`:

- `parseLinearGradientAngle` parses `deg` / `rad` / `turn` / `to <side>` into an
  angle.
- `calculateGradientTransform(angle)` builds the Figma `gradientTransform`
  (including the CSS→Figma 90° rotation and Y-flip) and stores it on the paint's
  `transform` field (`FigmaBasePaint.transform?: FigmaTransform`).

But the plugin builder ignores it. `apps/plugin/src/builder/paint-mapper.ts:36`
hardcodes `DEFAULT_GRADIENT_TRANSFORM` (identity → top-to-bottom) for every
`GRADIENT_LINEAR` paint, discarding `p.transform`. So every imported gradient
renders top-to-bottom regardless of its CSS angle.

The bug is entirely in the builder; the converter is correct.

## Fix

In `mapPaints`'s `GRADIENT_LINEAR` branch, use the paint's `transform` when
present, converting the converter's object form
`{ m00, m01, m02, m10, m11, m12 }` (`FigmaTransform`) to Figma's matrix form
`[[m00, m01, m02], [m10, m11, m12]]` (`Transform`). Fall back to
`DEFAULT_GRADIENT_TRANSFORM` only when `transform` is absent (defensive — the
converter always sets it for linear gradients, but the field is optional on the
type).

## Unit

A small pure helper in `paint-mapper.ts`:

```ts
function toFigmaTransform(t: {
  m00: number; m01: number; m02: number;
  m10: number; m11: number; m12: number;
}): Transform {
  return [
    [t.m00, t.m01, t.m02],
    [t.m10, t.m11, t.m12],
  ];
}
```

The `GRADIENT_LINEAR` branch then uses:
`gradientTransform: p.transform ? toFigmaTransform(p.transform) : (DEFAULT_GRADIENT_TRANSFORM as Transform)`.

`DEFAULT_GRADIENT_TRANSFORM` stays as the fallback; its comment is updated (it's
no longer "V1 always top-to-bottom", just the no-transform fallback).

## Files

- `apps/plugin/src/builder/paint-mapper.ts` — add `toFigmaTransform`, use
  `p.transform` in the gradient branch, update the comment.
- `apps/plugin/src/builder/paint-mapper.test.ts` — new gradient-transform cases.

The converter (`@wooframe/dom-to-figma`) is **not** touched — it already computes
the transform.

## Testing

In `paint-mapper.test.ts` (node, mocked figma already present):

1. A `GRADIENT_LINEAR` paint **with** a non-identity `transform` (e.g.
   `{ m00: 0, m01: -1, m02: 1, m10: 1, m11: 0, m12: 0 }`) → the mapped
   `gradientTransform` is `[[0, -1, 1], [1, 0, 0]]` (the matrix form), **not** the
   identity default.
2. A gradient paint **without** `transform` → `gradientTransform` equals
   `DEFAULT_GRADIENT_TRANSFORM` (`[[1, 0, 0], [0, 1, 0]]`).
3. The existing "maps a linear gradient with stops" test still passes (stops are
   unchanged).

## Out of scope

- The correctness of `calculateGradientTransform`'s angle math (CSS→Figma 90° +
  Y-flip) — that is pre-existing converter code, assumed correct. This fix stops
  the builder from discarding it; if a specific angle still looks off, that's a
  separate converter-side investigation.
- Radial / conic gradients (the converter only emits `GRADIENT_LINEAR`).
