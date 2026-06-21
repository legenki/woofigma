/**
 * Font Scaling Primitives
 *
 * Handles glyph coordinate transformations based on font metrics.
 * Provides functions for scaling coordinates from font units to pixels.
 *
 * @module ScalingPrimitives
 */

import { fontUnitsToPixels } from "../../primitives/font/metrics";

import type { FontMetrics, OpenTypeGlyph } from "../../types";

/**
 * Scale glyph advance width to pixels
 *
 * @param glyph - OpenType.js glyph object
 * @param metrics - Font metrics
 * @param fontSize - Font size in pixels
 * @returns Advance width scaled to pixels
 *
 * @example
 * ```typescript
 * const advance = scaleAdvanceWidth(glyph, fontMetrics, 16);
 * console.log(`Character advance: ${advance}px`);
 * ```
 */
export function scaleAdvanceWidth(
  glyph: OpenTypeGlyph,
  metrics: FontMetrics,
  fontSize: number
): number {
  const advanceWidth = glyph.advanceWidth ?? 0;
  return fontUnitsToPixels(advanceWidth, fontSize, metrics.unitsPerEm);
}
