// Snapshot bookmarklet source. Captures a page's live (post-JS) DOM, inlines its
// computed styles (so it re-renders identically), strips scripts, and
// downloads/copies a self-contained .html for the Woofigma plugin.
//
// CSS properties NOT inlined into the snapshot. Everything else getComputedStyle
// reports is inlined so the re-rendered snapshot lays out identically. These are
// excluded because they break re-rendering or are pure noise. getComputedStyle
// enumerates longhands (not shorthands), so the animation/transition longhands
// are listed individually. A guard test (snapshot-whitelist.test.ts) fails the
// build if the converter ever reads a property listed here.
export const SNAPSHOT_SKIP_PROPS = new Set([
  "content",
  "cursor",
  "will-change",
  "contain",
  "content-visibility",
  "inline-size",
  "block-size",
  "animation",
  "animation-name",
  "animation-duration",
  "animation-delay",
  "animation-direction",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-play-state",
  "animation-timeline",
  "animation-timing-function",
  "transition",
  "transition-property",
  "transition-duration",
  "transition-delay",
  "transition-timing-function",
]);

// Recursively copy whitelisted computed styles from `original` onto `clone`,
// walking element children in lockstep. `getStyle(el)` returns an object with a
// `getPropertyValue(prop)` method (real getComputedStyle in the bookmarklet, a
// stub in tests). Shadow roots are not traversed; nothing here throws on a
// shadow host because we only read light-DOM `children`.
function inlineStyles(original, clone, getStyle) {
  const computed = getStyle(original);
  const decls = [];
  // A real CSSStyleDeclaration is iterable over its property names.
  for (const prop of computed) {
    if (SNAPSHOT_SKIP_PROPS.has(prop)) {
      continue;
    }
    const value = computed.getPropertyValue(prop);
    if (value) {
      decls.push(`${prop}: ${value}`);
    }
  }
  if (decls.length > 0) {
    clone.setAttribute("style", decls.join("; "));
  }
  const originalChildren = original.children;
  const cloneChildren = clone.children;
  for (let i = 0; i < originalChildren.length; i += 1) {
    inlineStyles(originalChildren[i], cloneChildren[i], getStyle);
  }
}

// Build a self-contained HTML document string from a live document element.
// `getStyle` defaults to window.getComputedStyle in the browser.
export function buildSnapshotHtml(
  documentElement,
  getStyle = (el) => globalThis.getComputedStyle(el)
) {
  const clone = documentElement.cloneNode(true);
  inlineStyles(documentElement, clone, getStyle);
  for (const el of clone.querySelectorAll("script, noscript")) {
    el.remove();
  }
  return `<!doctype html>\n${clone.outerHTML}`;
}

// Bookmarklet entry: build the snapshot from the current page, download it, copy
// to clipboard (best-effort), and toast the user. Not unit-tested (browser-only
// side effects); the testable logic lives in buildSnapshotHtml above.
export function runSnapshot() {
  const toast = (msg) => {
    let el = document.getElementById("__woofigma_toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__woofigma_toast";
      el.style.cssText =
        "position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#0d99ff;color:#fff;font:13px/1.4 sans-serif;padding:8px 14px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2)";
      document.body.appendChild(el);
    }
    el.textContent = msg;
  };

  const count = document.documentElement.querySelectorAll("*").length;
  toast(`Processing ${count} elements…`);

  const html = buildSnapshotHtml(document.documentElement);

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "woofigma-snapshot.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(html).catch(() => {
      // clipboard blocked (no permission/gesture) — the download already fired.
    });
  }

  toast("Snapshot saved — drop the .html into Woofigma (or paste).");
}
