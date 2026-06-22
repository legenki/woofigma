# Gradient direction in the plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make imported linear gradients use the CSS-derived direction the converter already computes, instead of the hardcoded top-to-bottom default in the plugin builder.

**Architecture:** The converter stores the gradient `transform` (object form `{m00..m12}`) on each `GRADIENT_LINEAR` paint. `paint-mapper.ts` currently discards it and emits an identity `gradientTransform`. Add a `toFigmaTransform` helper that converts the object to Figma's matrix form, and use `p.transform` (falling back to the default only when absent). One file + its test; converter untouched.

**Tech Stack:** TypeScript, Vitest (node, mocked figma), Figma `Transform = [[number,number,number],[number,number,number]]`.

---

## File Structure

- **Modify** `apps/plugin/src/builder/paint-mapper.ts` — add `toFigmaTransform`; use `p.transform` in the `GRADIENT_LINEAR` branch; update the default's comment.
- **Modify** `apps/plugin/src/builder/paint-mapper.test.ts` — two new gradient-transform cases.

---

## Task 1: Use the paint's gradient transform

**Files:**
- Modify: `apps/plugin/src/builder/paint-mapper.ts`
- Test: `apps/plugin/src/builder/paint-mapper.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these two `it` blocks inside the existing `describe("mapPaints", …)` in
`apps/plugin/src/builder/paint-mapper.test.ts`, right after the existing
"maps a linear gradient with stops" test (before the closing `});` of that
describe at line 73):

```ts
  it("uses the paint's transform for the gradient direction", () => {
    const paints: Array<FigmaPaint> = [
      {
        type: "GRADIENT_LINEAR",
        stops: [
          { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
          { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
        ],
        opacity: 1,
        visible: true,
        blendMode: "NORMAL",
        transform: { m00: 0, m01: -1, m02: 1, m10: 1, m11: 0, m12: 0 },
      } as FigmaPaint,
    ];
    const out = mapPaints(paints, ctx());
    expect(
      (out[0] as unknown as { gradientTransform: unknown }).gradientTransform
    ).toEqual([
      [0, -1, 1],
      [1, 0, 0],
    ]);
  });

  it("falls back to the identity transform when the paint has none", () => {
    const paints: Array<FigmaPaint> = [
      {
        type: "GRADIENT_LINEAR",
        stops: [
          { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
          { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
        ],
        opacity: 1,
        visible: true,
        blendMode: "NORMAL",
      },
    ];
    const out = mapPaints(paints, ctx());
    expect(
      (out[0] as unknown as { gradientTransform: unknown }).gradientTransform
    ).toEqual([
      [1, 0, 0],
      [0, 1, 0],
    ]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter plugin exec vitest run paint-mapper.test.ts`
Expected: FAIL — the first new test gets the identity `[[1,0,0],[0,1,0]]`
(hardcoded default) instead of the transform's matrix. The fallback test passes
already (the default is currently always used).

- [ ] **Step 3: Add `toFigmaTransform` and use `p.transform`**

In `apps/plugin/src/builder/paint-mapper.ts`, update the gradient default comment
and add the helper. Replace the existing top-of-file constant:

```ts
// Fallback gradient transform (identity → top-to-bottom), used only when a
// gradient paint carries no transform. The converter normally computes the real
// direction from the CSS angle and sets it on the paint.
const DEFAULT_GRADIENT_TRANSFORM = [
  [1, 0, 0],
  [0, 1, 0],
];

// The converter stores a gradient transform as an object; Figma wants a matrix.
function toFigmaTransform(t: {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}): Transform {
  return [
    [t.m00, t.m01, t.m02],
    [t.m10, t.m11, t.m12],
  ];
}
```

Then in the `GRADIENT_LINEAR` branch of `mapPaints`, replace the
`gradientTransform` line:

```ts
        gradientTransform: p.transform
          ? toFigmaTransform(p.transform)
          : (DEFAULT_GRADIENT_TRANSFORM as Transform),
```

(The rest of the branch — `gradientStops`, `opacity`, `visible`, `blendMode` —
is unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter plugin exec vitest run paint-mapper.test.ts`
Expected: PASS (the stops test + both new transform tests).

- [ ] **Step 5: Typecheck + full plugin suite + lint**

Run: `pnpm --filter plugin check-types && pnpm --filter plugin exec vitest run && pnpm exec biome check apps/plugin/src/builder/paint-mapper.ts apps/plugin/src/builder/paint-mapper.test.ts`
Expected: typecheck PASS; all plugin tests PASS; biome no errors (infos/warnings
non-blocking).

- [ ] **Step 6: Rebuild the plugin**

Run: `pnpm --filter plugin build`
Expected: build succeeds (`dist/code.js` + `dist/index.html`).

- [ ] **Step 7: Commit**

```bash
git add apps/plugin/src/builder/paint-mapper.ts apps/plugin/src/builder/paint-mapper.test.ts
git commit -m "fix(plugin): use the CSS-derived gradient direction"
```

---

## Task 2: Update the README limitation note

**Files:**
- Modify: `apps/plugin/README.md`

- [ ] **Step 1: Update the Scope note**

In `apps/plugin/README.md`, the Scope paragraph currently ends (line 59) with the
clause `Not yet handled: deriving gradient direction from the CSS angle.` This was
the last remaining unhandled item, so replace just that sentence (keep the
preceding text about icon/symbol fallback) with:

Replace:

```markdown
being dropped. Not yet handled: deriving gradient direction from the CSS angle.
```

with:

```markdown
being dropped. Linear gradients use the direction derived from the CSS angle
(radial/conic gradients aren't emitted by the converter).
```

- [ ] **Step 2: Verify no stale "not yet handled" gradient note remains**

Run: `grep -rn "gradient direction" apps/plugin/README.md README.md`
Expected: only the resolved phrasing, none framing it as unhandled.

- [ ] **Step 3: Commit**

```bash
git add apps/plugin/README.md
git commit -m "docs: note gradient direction is derived from the CSS angle"
```

---

## Self-Review

- **Spec coverage:** `toFigmaTransform` object→matrix helper (Task 1 Step 3) ✓;
  use `p.transform` with fallback (Task 1 Step 3) ✓; test with non-identity
  transform → matrix form (Task 1 Step 1, case 1) ✓; test without transform →
  default (Task 1 Step 1, case 2) ✓; existing stops test untouched/passing (Task
  1 Step 4) ✓; converter not touched (no task modifies it) ✓; README note (Task
  2) ✓.
- **Placeholders:** none — full test and impl code shown.
- **Type consistency:** `toFigmaTransform(t: {m00..m12}): Transform` defined in
  Step 3 and its output `[[0,-1,1],[1,0,0]]` matches the test's expectation in
  Step 1. `Transform` is the Figma global type already used by the existing
  `DEFAULT_GRADIENT_TRANSFORM as Transform` cast in this file. `p.transform` is
  `FigmaBasePaint.transform?: FigmaTransform` (`{m00..m12}`), matching the
  helper's parameter.
- **Test note:** case 1 sets `transform` via `as FigmaPaint` because `transform`
  is optional on the union; case 2 omits it (also valid). The `ctx()` helper and
  `as unknown as { … }` cast pattern match the existing gradient test in this
  file.