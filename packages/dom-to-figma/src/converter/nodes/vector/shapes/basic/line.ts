/**
 * Converts a line element to an SVG path string.
 *
 * Creates a simple path from one point to another using move (M) and line (L) commands.
 * This is the most basic path conversion, producing a straight line segment.
 *
 * @param x1 - The x-coordinate of the starting point
 * @param y1 - The y-coordinate of the starting point
 * @param x2 - The x-coordinate of the ending point
 * @param y2 - The y-coordinate of the ending point
 * @returns SVG path string representing the line
 *
 * @example
 * ```typescript
 * const path = lineToPath(10, 20, 50, 80);
 * // Returns: "M10 20 L50 80"
 * ```
 */
export function lineToPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  return `M${x1} ${y1} L${x2} ${y2}`;
}
