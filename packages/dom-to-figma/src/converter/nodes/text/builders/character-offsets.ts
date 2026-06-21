/**
 * Figma Character Offsets Builder
 *
 * Creates character offset mappings required by Figma text nodes for
 * text selection, cursor positioning, and editing operations.
 *
 * @module CharacterOffsetsBuilder
 */

import type { ProcessedTextLayout } from "../types";

/**
 * Build character offset mapping for Figma text selection
 *
 * Creates an array of character positions that Figma uses for text editing
 * operations like cursor positioning, text selection, and character indexing.
 *
 * @param layout - Processed text layout with glyph positions
 * @returns Array of character offsets in pixels from the start of each line
 *
 * @example
 * ```typescript
 * const offsets = buildCharacterOffsets(layout);
 * console.log(`Generated ${offsets.length} character offsets`);
 * // offsets[5] gives the X position of the 6th character
 * ```
 */
export function buildCharacterOffsets(
  layout: ProcessedTextLayout
): Array<number> {
  if (layout.isMultiLine && layout.multiLineLayout) {
    return buildMultiLineOffsets(layout);
  }
  return buildSingleLineOffsets(layout);
}

/**
 * Calculate character offsets for multi-line text
 *
 * For multi-line text, character offsets are calculated relative to the
 * start of each line, not the absolute text start. This allows Figma to
 * properly handle line breaks and text wrapping.
 *
 * @param layout - Multi-line text layout
 * @returns Array of character offsets with line-relative positioning
 *
 * @internal
 */
function buildMultiLineOffsets(layout: ProcessedTextLayout): Array<number> {
  const offsets: Array<number> = [];
  let positionIndex = 0;

  if (!layout.multiLineLayout) {
    return []; // No multi-line data available
  }

  for (const line of layout.multiLineLayout.lines) {
    // First character of each line starts at X position 0 (relative to line start)
    const lineStartOffset = layout.positions[positionIndex]?.x ?? 0;
    offsets.push(0);

    // Calculate relative positions for remaining characters in the line
    for (let j = 1; j < line.positions.length; j += 1) {
      const currentPos = layout.positions[positionIndex + j];
      if (currentPos) {
        const relativeX = currentPos.x - lineStartOffset;
        offsets.push(relativeX);
      }
    }

    positionIndex += line.positions.length;
  }

  return offsets;
}

/**
 * Calculate character offsets for single-line text
 *
 * For single-line text, character offsets are simply the X positions
 * of each glyph relative to the text start position.
 *
 * @param layout - Single-line text layout
 * @returns Array of character offsets with absolute positioning
 *
 * @internal
 */
function buildSingleLineOffsets(layout: ProcessedTextLayout): Array<number> {
  const offsets: Array<number> = [];
  const textStartX = layout.positions[0]?.x ?? 0;

  // Calculate offset for each character position
  for (const position of layout.positions) {
    const relativeX = position.x - textStartX;
    offsets.push(relativeX);
  }

  return offsets;
}
