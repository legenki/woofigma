import { buildNodes } from "./builder/build-nodes";
import { ROOT_PARENT_LOCAL_ID } from "./constants";
import type { CodeToUi, UiToCode } from "./messages";

figma.showUI(__html__, { width: 420, height: 560 });

figma.ui.onmessage = async (msg: UiToCode) => {
  if (msg.type === "cancel") {
    figma.closePlugin();
    return;
  }
  if (msg.type === "FETCH_CORS") {
    try {
      const response = await fetch(msg.url);
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const buffer = await response.arrayBuffer();
      figma.ui.postMessage({
        type: "FETCH_CORS_RESULT",
        url: msg.url,
        buffer: new Uint8Array(buffer),
      } satisfies CodeToUi);
    } catch (e) {
      figma.ui.postMessage({
        type: "FETCH_CORS_ERROR",
        url: msg.url,
        message: String(e),
      } satisfies CodeToUi);
    }
    return;
  }
  if (msg.type !== "import-nodes") {
    return;
  }

  try {
    const { root, summary } = await buildNodes(
      msg.nodeChanges,
      ROOT_PARENT_LOCAL_ID,
      msg.rootName,
      msg.blobs,
      (message, built, total) => {
        figma.ui.postMessage({
          type: "import-progress",
          message,
          built,
          total,
        });
      }
    );
    figma.currentPage.appendChild(root);
    root.x = figma.viewport.center.x - root.width / 2;
    root.y = figma.viewport.center.y - root.height / 2;
    figma.viewport.scrollAndZoomIntoView([root]);
    const done: CodeToUi = {
      type: "import-done",
      built: summary.built,
      total: summary.total,
      skipped: summary.skipped,
      missingFonts: summary.missingFonts,
      warnings: summary.warnings,
    };
    figma.ui.postMessage(done);
  } catch (error) {
    const err: CodeToUi = {
      type: "import-error",
      message: (error as Error).message,
    };
    figma.ui.postMessage(err);
  }
};
