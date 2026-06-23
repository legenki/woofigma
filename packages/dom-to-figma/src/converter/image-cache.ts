import { DedupCache } from "./dedup-cache";
import type { ImageBlobInfo, ImageLoader } from "./nodes/image/loader";
import { processImageFile } from "./nodes/image/loader";

export type ImageCache = DedupCache<
  HTMLImageElement | HTMLVideoElement,
  ImageBlobInfo
>;

export function createImageCache(imageLoader: ImageLoader): ImageCache {
  let uniqueCounter = 0;
  return new DedupCache({
    load: (element) =>
      imageLoader({
        src: (element as any).src || (element as any).currentSrc,
        element,
      }).then(processImageFile),
    toCacheKey: (element) => {
      const src = (element as any).src || (element as any).currentSrc;
      if (src) return src;
      if (element.tagName.toLowerCase() === "video") {
        const poster = (element as HTMLVideoElement).poster;
        if (poster) {
          return `video-poster-${poster.length}-${poster.substring(0, 50)}-${poster.substring(poster.length - 50)}`;
        }
      }
      return `no-src-${uniqueCounter++}`;
    },
  });
}
