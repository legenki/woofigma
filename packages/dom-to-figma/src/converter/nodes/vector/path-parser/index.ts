/**
 * @fileoverview SVG path parsing and normalization utilities.
 *
 * This module provides the complete pipeline for parsing SVG path data strings
 * into normalized, absolute-coordinate command objects. It combines tokenization
 * and normalization into a single convenient interface.
 */

import { normalizeCommands } from "./normalizer";
import type { PathCommand } from "./tokenizer";
import { parseSVGPath } from "./tokenizer";

export type { PathCommand } from "./tokenizer";

/**
 * Parses and normalizes an SVG path data string in one operation.
 *
 * This is the main entry point for path parsing, combining tokenization
 * and normalization into a single convenient function. It handles the
 * complete conversion from raw path string to processable command objects.
 *
 * @param pathData - The SVG path data string (value of 'd' attribute)
 * @returns Array of normalized PathCommand objects with absolute coordinates
 *
 * @example
 * ```typescript
 * const commands = parseAndNormalizePath("M10,20 l5,10 h15 Z");
 * // Returns normalized commands with absolute coordinates
 * ```
 */
export function parseAndNormalizePath(pathData: string): Array<PathCommand> {
  const rawCommands = parseSVGPath(pathData);
  return normalizeCommands(rawCommands);
}
