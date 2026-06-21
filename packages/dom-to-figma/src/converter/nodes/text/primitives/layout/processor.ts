/**
 * Layout Processing Primitives
 *
 * Main entry point for comprehensive text layout processing that coordinates
 * glyph positioning, wrapping, alignment, and scaling operations.
 *
 * @module LayoutProcessor
 */

import { extractFontMetrics } from "../../primitives/font";
import type {
  OpenTypeFont,
  ProcessedTextLayout,
  TextLayoutOptions,
} from "../../types";
import {
  calculateGlyphPositions,
  calculateTextWidth,
  createSimpleLayout,
} from "./positioning";
import type { WrappingOptions } from "./wrapping";
import {
  applyPerLineAlignment,
  calculateWrappedLayout,
  extractAllGlyphPositions,
} from "./wrapping";

/**
 * Process complete text layout using font metrics and properties
 *
 * Main entry point for comprehensive text layout processing that integrates
 * glyph positioning, wrapping, alignment, and creates the final layout structure.
 *
 * @param font - OpenType.js font object
 * @param text - Text string to layout
 * @param options - Complete layout configuration
 * @returns Fully processed text layout ready for rendering
 *
 * @example
 * ```typescript
 * const layout = processTextLayout(font, "Hello World", {
 *   fontSize: 16,
 *   alignment: 'center',
 *   containerWidth: 200,
 *   wrapping: { enabled: true, wordWrap: true }
 * });
 * ```
 */
export function processTextLayout(
  font: OpenTypeFont,
  text: string,
  options: TextLayoutOptions
): ProcessedTextLayout {
  // Extract font metrics
  const metrics = extractFontMetrics(font);

  // Text wrapping should always be enabled when we have width constraints
  const shouldWrap =
    options.containerWidth && options.wrapping?.enabled !== false;

  if (shouldWrap) {
    // Use multi-line wrapping layout
    const wrappingOptions: WrappingOptions = {
      ...options.spacing,
      maxWidth: options.containerWidth,
      wordWrap: options.wrapping?.wordWrap ?? true,
      breakWords: options.wrapping?.breakWords ?? false,
      alignment: options.alignment,
      containerWidth: options.containerWidth,
      lineHeight: options.lineHeight,
    };

    let multiLineLayout = calculateWrappedLayout(
      font,
      text,
      metrics,
      options.fontSize,
      wrappingOptions
    );

    // Apply per-line alignment if specified
    if (options.alignment && options.alignment !== "left") {
      multiLineLayout = applyPerLineAlignment(
        multiLineLayout,
        options.alignment,
        options.containerWidth
      );
    }

    // Extract all glyph positions for compatibility
    const positions = extractAllGlyphPositions(multiLineLayout);

    // Create layout without additional alignment (already applied per-line)
    // IMPORTANT: preserveY=true to keep multi-line y positions from extractAllGlyphPositions
    const layout = createSimpleLayout(
      positions,
      metrics,
      options.fontSize,
      multiLineLayout.totalWidth,
      {
        horizontal: "left", // No additional alignment needed
        containerWidth: options.containerWidth,
        baselineY: options.baselineY,
      },
      true // preserveY: true for multi-line text
    );

    return {
      ...layout,
      metrics,
      textWidth: multiLineLayout.totalWidth,
      glyphCount: positions.length,
      options,
      multiLineLayout,
      isMultiLine: true,
    };
  }
  // Use single-line layout
  const positions = calculateGlyphPositions(
    font,
    text,
    metrics,
    options.fontSize,
    options.spacing
  );

  // Calculate total text width
  const textWidth = calculateTextWidth(
    font,
    text,
    metrics,
    options.fontSize,
    options.spacing
  );

  // Apply horizontal alignment
  const layout = createSimpleLayout(
    positions,
    metrics,
    options.fontSize,
    textWidth,
    {
      horizontal: options.alignment ?? "left",
      containerWidth: options.containerWidth,
      baselineY: options.baselineY,
    }
  );

  return {
    ...layout,
    metrics,
    textWidth,
    glyphCount: positions.length,
    options,
    isMultiLine: false,
  };
}
