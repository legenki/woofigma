import type { FigmaBlob } from "./types";

export class BlobManager {
  private blobs: Array<FigmaBlob> = [];
  private readonly blobDataToIndexMap = new Map<string, number>();

  registerBlob(blob: FigmaBlob): number {
    const blobKey = JSON.stringify(blob.bytes);

    const existingIndex = this.blobDataToIndexMap.get(blobKey);
    if (existingIndex !== undefined) {
      return existingIndex;
    }

    const index = this.blobs.length;
    this.blobs.push(blob);
    this.blobDataToIndexMap.set(blobKey, index);
    return index;
  }

  getBlobs(): Array<FigmaBlob> {
    return this.blobs;
  }

  clear(): void {
    this.blobs = [];
    this.blobDataToIndexMap.clear();
  }
}
