// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildSnapshotHtml } from "./snapshot.js";

// Inject a deterministic, iterable getStyle (length + indices + getPropertyValue),
// matching the shape of a real CSSStyleDeclaration, so the test exercises the
// computed-declaration loop without relying on happy-dom's computed styles.
function makeStyle(map: Record<string, string>) {
  const keys = Object.keys(map);
  const decl: Record<string, unknown> = {
    length: keys.length,
    getPropertyValue: (p: string) => map[p] ?? "",
    [Symbol.iterator]: () => keys[Symbol.iterator](),
  };
  keys.forEach((k, i) => {
    decl[i] = k;
  });
  return decl as unknown as CSSStyleDeclaration;
}

function getStyle(_el: Element): CSSStyleDeclaration {
  return makeStyle({
    color: "rgb(1, 2, 3)",
    width: "100px",
    "flex-direction": "column",
    gap: "20px",
    "justify-content": "center",
    "grid-template-columns": "1fr 1fr",
    transform: "translateX(5px)",
    cursor: "pointer", // blacklisted — must be dropped
    content: '"x"', // blacklisted — must be dropped
    "animation-name": "spin", // blacklisted — must be dropped
    "transition-duration": "1s", // blacklisted — must be dropped
  });
}

describe("buildSnapshotHtml", () => {
  it("inlines layout-critical properties onto elements", () => {
    document.body.innerHTML = "<div id='x'>hi</div>";
    const html = buildSnapshotHtml(document.documentElement, getStyle);
    expect(html).toContain("width: 100px");
    expect(html).toContain("flex-direction: column");
    expect(html).toContain("gap: 20px");
    expect(html).toContain("justify-content: center");
    expect(html).toContain("grid-template-columns: 1fr 1fr");
    expect(html).toContain("transform: translateX(5px)");
  });

  it("does not inline blacklisted properties", () => {
    document.body.innerHTML = "<div>hi</div>";
    const html = buildSnapshotHtml(document.documentElement, getStyle);
    expect(html).not.toContain("cursor");
    expect(html).not.toContain("animation-name");
    expect(html).not.toContain("transition-duration");
    // "content:" would substring-collide with "justify-content:", so match the
    // declaration boundary instead.
    expect(html).not.toMatch(/[;"]\s*content:/);
  });

  it("strips <script> and <noscript>", () => {
    document.body.innerHTML =
      "<div>hi</div><script>alert(1)</script><noscript>x</noscript>";
    const html = buildSnapshotHtml(document.documentElement, getStyle);
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("<noscript");
  });

  it("produces a full HTML document", () => {
    document.body.innerHTML = "<div>hi</div>";
    const html = buildSnapshotHtml(document.documentElement, getStyle);
    expect(html.trimStart().toLowerCase()).toMatch(/^<!doctype html>/);
    expect(html).toContain("<html");
  });

  it("does not throw on a shadow host", () => {
    document.body.innerHTML = "<div id='host'></div>";
    const host = document.getElementById("host");
    host?.attachShadow({ mode: "open" });
    expect(() =>
      buildSnapshotHtml(document.documentElement, getStyle)
    ).not.toThrow();
  });
});
