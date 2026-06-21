import type { FigmaBlob } from "./core";
import type { FigmaNodeChange } from "./node";

export type FigmaClipboard = {
  type: "NODE_CHANGES";
  sessionID: number;
  ackID: number;
  nodeChanges: Array<FigmaNodeChange>;
  blobs: Array<FigmaBlob>;
  pasteID: number;
  pasteFileKey: string;
  pasteIsPartiallyOutsideEnclosingFrame: boolean;
  isCut: boolean;
  pasteEditorType: string;
  publishedAssetGuids: Array<string>;
};
