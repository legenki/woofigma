import type { FigmaNodeChange } from "@wooframe/dom-to-figma/internal";

export type UiToCode =
  | {
      type: "import-nodes";
      nodeChanges: Array<FigmaNodeChange>;
      rootName: string;
      blobs: Array<{ bytes: Array<number> }>;
    }
  | { type: "FETCH_CORS"; url: string }
  | { type: "cancel" };

export type CodeToUi =
  | {
      type: "import-done";
      built: number;
      total: number;
      skipped: number;
      missingFonts: Array<string>;
      warnings: Array<string>;
    }
  | {
      type: "import-progress";
      message: string;
      built?: number;
      total?: number;
    }
  | { type: "import-error"; message: string }
  | { type: "FETCH_CORS_RESULT"; url: string; buffer: Uint8Array }
  | { type: "FETCH_CORS_ERROR"; url: string; message: string };
