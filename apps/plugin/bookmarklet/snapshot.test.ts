// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildSnapshotHtml } from "./snapshot.js";

// Inject a deterministic getStyle so the test doesn't rely on happy-dom's
// (incomplete) computed styles. Returns a fixed map for every element.
function fakeGetStyle(): Record<string, string> {
  return {
    color: "rgb(1, 2, 3)",
    "padding-top": "10px",
    cursor: "pointer", // not in the whitelist — must be dropped
    "z-index": "5", // not in the whitelist — must be dropped
  };
}

function getStyle(_el: Element) {
  const map = fakeGetStyle();
  return { getPropertyValue: (p: string) => map[p] ?? "" };
}

describe("buildSnapshotHtml", () => {
  it("inlines whitelisted properties onto elements", () => {
    document.body.innerHTML = "<div id='x'>hi</div>";
    const html = buildSnapshotHtml(document.documentElement, getStyle);
    expect(html).toContain("color: rgb(1, 2, 3)");
    expect(html).toContain("padding-top: 10px");
  });

  it("does not inline non-whitelisted properties", () => {
    document.body.innerHTML = "<div>hi</div>";
    const html = buildSnapshotHtml(document.documentElement, getStyle);
    expect(html).not.toContain("cursor");
    expect(html).not.toContain("z-index");
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
