// ~10 s base, +1 s per MB of HTML, capped at 60 s. Large SingleFile captures
// (10 MB+) overran the old fixed 10 s during doc.write + layout + image decode.
const BASE_MS = 10_000;
const PER_MB_MS = 1000;
const MAX_MS = 60_000;
const MB = 1_000_000;

export function computeLoadTimeout(htmlLength: number): number {
  // Only full megabytes add time, so sub-1 MB documents keep the base.
  return Math.min(MAX_MS, BASE_MS + Math.floor(htmlLength / MB) * PER_MB_MS);
}
