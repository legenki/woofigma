import { createFigmaConverter } from "@wooframe/dom-to-figma";
import type { FigmaNodeChange } from "@wooframe/dom-to-figma/internal";
import { computeLoadTimeout } from "./render-timeout";

// Heuristic delay after `load` for bundled pages to finish unpacking into the
// DOM. 400ms covers the exported files tested so far; hydration-heavy pages may
// need more. Future work: replace with a MutationObserver + requestIdleCallback
// settle detector.
const STABILIZE_MS = 400;
// Default render width (Macbook preset). Callers override per screen-size choice.
const DEFAULT_RENDER_WIDTH = 1440;
// Fixed render viewport height. Kept constant (NOT resized to the measured
// content height) so that vh-based styles — e.g. a hero with `height: 100vh` —
// resolve to a normal viewport instead of ballooning to the full page height.
const RENDER_HEIGHT = 1080;

export type RenderResult = {
  nodeChanges: Array<FigmaNodeChange>;
  rootName: string;
  blobs: Array<{ bytes: Array<number> }>;
};

export async function renderAndConvert(
  html: string,
  rootName: string,
  width: number = DEFAULT_RENDER_WIDTH
): Promise<RenderResult> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${RENDER_HEIGHT}px;border:0;visibility:hidden`;
  document.body.appendChild(iframe);

  try {
    await writeAndWait(iframe, html);
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error("Could not access rendered document");
    }
    const body = doc.body;
    const width = Math.max(1, Math.round(doc.documentElement.scrollWidth));
    const height = Math.max(1, Math.round(doc.documentElement.scrollHeight));

    const converter = createFigmaConverter();
    const result = await converter.convert({
      element: body,
      width,
      height,
      name: rootName,
    });
    return {
      nodeChanges: result.document.nodeChanges,
      rootName,
      blobs: result.document.blobs,
    };
  } finally {
    iframe.remove();
  }
}

function writeAndWait(iframe: HTMLIFrameElement, html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // We add an extra 3 seconds to the overall timeout to account for media loading
    const timer = setTimeout(
      () => reject(new Error("Render timed out")),
      computeLoadTimeout(html.length) + 3000
    );
    iframe.addEventListener(
      "load",
      async () => {
        // Give bundled-page inline scripts time to unpack into the DOM.
        await new Promise((r) => setTimeout(r, STABILIZE_MS));
        await waitForMedia(iframe.contentDocument);
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
    const doc = iframe.contentDocument;
    if (!doc) {
      clearTimeout(timer);
      reject(new Error("Could not open iframe document"));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
  });
}

async function waitForMedia(doc: Document | null): Promise<void> {
  if (!doc) return;
  const videos = Array.from(doc.querySelectorAll("video"));
  const images = Array.from(doc.querySelectorAll("img"));

  const promises: Promise<void>[] = [];

  for (const video of videos) {
    if (video.readyState >= 2) continue; // HAVE_CURRENT_DATA
    promises.push(
      new Promise<void>((resolve) => {
        const onData = () => {
          video.removeEventListener("loadeddata", onData);
          video.removeEventListener("error", onData);
          resolve();
        };
        video.addEventListener("loadeddata", onData);
        video.addEventListener("error", onData);
      })
    );
    if (video.preload === "none") {
      video.preload = "auto";
    }
  }

  for (const img of images) {
    if (img.complete) continue;
    promises.push(
      new Promise<void>((resolve) => {
        const onData = () => {
          img.removeEventListener("load", onData);
          img.removeEventListener("error", onData);
          resolve();
        };
        img.addEventListener("load", onData);
        img.addEventListener("error", onData);
      })
    );
    if (img.loading === "lazy") {
      img.loading = "eager";
    }
  }

  if (promises.length > 0) {
    // Wait for all media up to 3000ms max
    await Promise.race([
      Promise.all(promises),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }
}
